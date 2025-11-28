<?php
// api/upload.php

// --- MIME TYPE HELPERS ---
function get_mime_type_from_extension($extension) {
    $mime_types = [
        'jpeg' => 'image/jpeg',
        'jpg' => 'image/jpeg',
        'png' => 'image/png',
        'gif' => 'image/gif',
        'webp' => 'image/webp',
        'mp4' => 'video/mp4',
        'webm' => 'video/webm',
        'mov' => 'video/quicktime',
        'qt' => 'video/quicktime',
    ];
    return $mime_types[$extension] ?? 'application/octet-stream';
}

function get_file_mime_type($file) {
    if (function_exists('mime_content_type')) {
        return mime_content_type($file['tmp_name']);
    }
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    return get_mime_type_from_extension($extension);
}

// --- RATE LIMIT ---
function check_upload_rate_limit($redis, $userId) {
    if (!$redis || !$userId) return;
    $key = 'upload_limit:' . $userId;
    $limit = 10; 
    $window = 60;
    $current = $redis->incr($key);
    if ($current === 1) {
        $redis->expire($key, $window);
    }
    if ($current > $limit) {
        send_error('Upload rate limit exceeded. Please wait a moment.', 429);
    }
}

function handle_upload($conn) {
    global $current_user_uid, $redis;

    if (!$current_user_uid) {
        send_error('Authentication required to upload files.', 401);
        return;
    }

    check_upload_rate_limit($redis, $current_user_uid);

    // R2 Presigned URL Generation (No file upload to PHP server involved)
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_GET['action']) && $_GET['action'] === 'generate-r2-presigned-url') {
        require_once 'api/upload/r2.php';
        handle_r2_presigned_url($conn);
        return;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        send_error('Method not allowed', 405);
    }
    
    $provider = $_GET['provider'] ?? 'server';

    try {
        if (!isset($_FILES['image'])) {
            send_error('No image file uploaded.', 400);
        }

        $file = $_FILES['image'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            send_error('File upload error code: ' . $file['error'], 500);
        }

        $allowed_extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov'];
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($extension, $allowed_extensions)) {
            send_error('Invalid file extension.', 400);
        }
        
        // Max Size Check
        $max_size_mb = 10;
        $result = $conn->query("SELECT setting_value FROM settings WHERE setting_key = 'imageUploadMaxSizeMb'");
        if ($result && $row = $result->fetch_assoc()) {
            $max_size_mb = (int)$row['setting_value'];
        }
        if ($file['size'] > $max_size_mb * 1024 * 1024) {
            send_error("File too large. Max {$max_size_mb}MB.", 400);
        }

        $file_urls = null;

        // Route to specific provider handler
        switch ($provider) {
            case 'tumblr':
                require_once 'api/upload/tumblr.php';
                $file_urls = upload_to_tumblr($conn, $file);
                break;
            case 'cloudinary':
                require_once 'api/upload/cloudinary.php';
                $file_urls = upload_to_cloudinary($conn, $file);
                break;
            case 'blogger':
                require_once 'api/upload/google_drive.php';
                $file_urls = upload_to_blogger($conn, $file);
                break;
            case 'imgbox':
                require_once 'api/upload/imgbox.php';
                $file_urls = upload_to_imgbox($file);
                break;
            case 'server':
            default:
                require_once 'api/upload/local.php';
                $file_urls = upload_to_local($file);
                break;
        }
        
        if ($file_urls) {
            send_json($file_urls);
        } else {
            send_error('Upload failed, no URL returned.', 500);
        }

    } catch (Throwable $e) {
        send_error('Server error: ' . $e->getMessage(), 500);
    }
}
?>