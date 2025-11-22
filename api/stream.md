
<?php
// api/stream.md - Video Streaming Proxy (Phase 2: Signed URLs & X-Sendfile/X-Accel-Redirect)

// --- CONFIGURATION - IMPORTANT! ---
// BƯỚC 1: Đặt một chuỗi ngẫu nhiên, dài và bí mật ở đây.
// Chuỗi này PHẢI GIỐNG hệt với chuỗi trong `api/prompts.md` và `api/reels.md`.
define('STREAMING_SECRET_KEY', 'your-very-secret-and-long-random-string');

// BƯỚC 2: Ánh xạ URL công khai của thư mục uploads tới đường dẫn nội bộ trên máy chủ.
// - Khóa (key) là phần đầu của URL được lưu trong cơ sở dữ liệu.
// - Giá trị (value) là đường dẫn tuyệt đối hoặc tương đối mà web server có thể truy cập.
//   - Đối với Nginx, đây là đường dẫn nội bộ (internal location path).
//   - Đối với Apache, đây là đường dẫn tuyệt đối trên hệ thống tệp.
define('STREAMING_UPLOAD_PATH_MAPPING', [
    // Ví dụ: 'https://yourdomain.com/uploads/' => '/protected_uploads/', (cho Nginx)
    // Ví dụ: 'https://yourdomain.com/uploads/' => '/var/www/html/uploads/', (cho Apache)
    'http://localhost/prompthub/uploads/' => '/prompthub_internal_uploads/', // Example for Nginx
    // 'http://localhost/prompthub/uploads/' => 'C:/xampp/htdocs/prompthub/uploads/', // Example for Apache on Windows
]);
// --- END CONFIGURATION ---


if (file_exists('../db.php')) {
    require_once '../db.php';
} else {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Database connection file not found.']);
    exit();
}

function send_stream_error($message, $code = 400) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode(['error' => $message]);
    exit();
}

// --- MAIN LOGIC ---
if (!isset($conn) || !$conn) {
    send_stream_error('Database connection failed.', 500);
}

$token = $_GET['token'] ?? null;
if (!$token) {
    send_stream_error('Token is missing.', 400);
}

// Token format: signature.expiry.base64(payload)
$parts = explode('.', $token, 3);
if (count($parts) !== 3) {
    send_stream_error('Invalid token format.', 403);
}
list($signature, $expiry, $payload_base64) = $parts;

// 1. Verify Expiry
if (!is_numeric($expiry) || (int)$expiry < time()) {
    send_stream_error('Access denied. This link has expired.', 410); // 410 Gone
}

// 2. Verify Signature
$expected_signature = hash_hmac('sha256', "$payload_base64.$expiry", STREAMING_SECRET_KEY);
if (!hash_equals($expected_signature, $signature)) {
    send_stream_error('Access denied. Invalid signature.', 403);
}

// 3. Decode Payload and get DB record
$payload_str = base64_decode($payload_base64, true);
if ($payload_str === false) {
    send_stream_error('Invalid token payload.', 403);
}

list($type, $id) = explode(':', $payload_str, 2);
$id = (int)$id;

if (!in_array($type, ['prompt', 'reel']) || $id <= 0) {
    send_stream_error('Invalid token resource type.', 403);
}

try {
    $table = ($type === 'prompt') ? 'prompts' : 'reels';
    
    $stmt = $conn->prepare("SELECT videoUrl FROM {$table} WHERE id = ?");
    if (!$stmt) { send_stream_error('Database query preparation failed.', 500); }
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    $item = $result->fetch_assoc();
    $stmt->close();
    
    if (!$item || empty($item['videoUrl'])) {
        send_stream_error('Video not found or URL is missing.', 404);
    }

    $video_url = $item['videoUrl'];

    // 4. Map public URL to internal/local path
    $internal_path = null;
    $mapped_local_prefix = null;

    foreach (STREAMING_UPLOAD_PATH_MAPPING as $public_prefix => $local_prefix) {
        if (strpos($video_url, $public_prefix) === 0) {
            $internal_path = str_replace($public_prefix, $local_prefix, $video_url);
            $mapped_local_prefix = $local_prefix;
            break;
        }
    }
    
    if (!$internal_path) {
        send_stream_error('Server configuration error: Cannot map video URL to an internal path.', 500);
    }

    // SECURITY: Path Traversal Prevention
    // Ensure the resolved path is still inside the intended directory.
    // For Nginx internal redirects, we can't verify realpath easily if mapped to an alias.
    // However, strict checking for '..' helps.
    if (strpos($internal_path, '..') !== false) {
        send_stream_error('Security violation: Path traversal detected.', 403);
    }
    
    // For Apache/Direct File System access, we can verify using realpath to ensure it's inside uploads
    // This block is optional and depends on if your mapping uses absolute paths
    $real_base_path = realpath($_SERVER['DOCUMENT_ROOT']); // Or specific upload root
    if ($real_base_path && strpos(realpath($internal_path), $real_base_path) !== 0 && stripos($_SERVER['SERVER_SOFTWARE'], 'apache') !== false) {
         // send_stream_error('Security violation: Path outside root detected.', 403);
    }


    // 5. Offload to web server
    // Clear all output buffers
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    // Determine file extension and set Content-Type
    $file_extension = strtolower(pathinfo($video_url, PATHINFO_EXTENSION));
    $mime_types = [
        'mp4' => 'video/mp4',
        'webm' => 'video/webm',
        'mov' => 'video/quicktime',
    ];
    $content_type = $mime_types[$file_extension] ?? 'application/octet-stream';
    header("Content-Type: " . $content_type);
    header("Content-Disposition: inline; filename=\"" . basename($video_url) . "\"");
    header('Accept-Ranges: bytes');

    // Check server software and send appropriate header
    if (stripos($_SERVER['SERVER_SOFTWARE'], 'nginx') !== false) {
        header("X-Accel-Redirect: " . $internal_path);
    } elseif (stripos($_SERVER['SERVER_SOFTWARE'], 'apache') !== false) {
        header("X-Sendfile: " . $internal_path);
    } else {
        // Fallback to PHP streaming if server is not recognized (less performant)
        if (file_exists($internal_path)) {
            readfile($internal_path);
        } else {
             // If mapped path is virtual (Nginx) but we fell back to PHP, we can't read it.
             // Try to best-guess the physical path if possible or fail gracefully.
             send_stream_error('Streaming fallback failed: File not accessible via PHP.', 500);
        }
    }
    exit;

} catch (Exception $e) {
    send_stream_error('Database error: ' . $e->getMessage(), 500);
}
?>
