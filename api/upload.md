<?php
// api/upload.php

use Aws\S3\S3Client;
use Aws\S3\Exception\S3Exception;
use GuzzleHttp\Client;

// --- MIME TYPE HELPER (START) ---
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
    // Best method: use fileinfo extension if available
    if (function_exists('mime_content_type')) {
        return mime_content_type($file['tmp_name']);
    }
    // Second best: use the extension (less secure but fallback)
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    return get_mime_type_from_extension($extension);
}
// --- MIME TYPE HELPER (END) ---

function check_upload_rate_limit($redis, $userId) {
    if (!$redis || !$userId) return;

    $key = 'upload_limit:' . $userId;
    $limit = 10; // Cho phép 10 file mỗi phút
    $window = 60;

    $current = $redis->incr($key);
    
    if ($current === 1) {
        $redis->expire($key, $window);
    }

    if ($current > $limit) {
        send_error('Upload rate limit exceeded. Please wait a moment.', 429);
    }
}

function upload_to_cloudinary($conn, $file) {
    // 1. Fetch Cloudinary configurations from the database
    $result = $conn->query("SELECT setting_value FROM settings WHERE setting_key = 'cloudinaryConfigs'");
    $configs_json = $result ? $result->fetch_assoc()['setting_value'] : null;

    if (!$configs_json) {
        send_error('Cloudinary configurations are not set on the server.', 500);
        return null;
    }

    $configs = json_decode($configs_json, true);
    if (!is_array($configs) || empty($configs)) {
        send_error('Cloudinary configurations are invalid or empty.', 500);
        return null;
    }

    // 2. Filter for enabled configs
    $enabled_configs = array_filter($configs, function($config) {
        return !empty($config['enabled']) && !empty($config['cloudName']) && !empty($config['uploadPreset']);
    });

    if (empty($enabled_configs)) {
        send_error('No enabled Cloudinary configurations found.', 500);
        return null;
    }

    // 3. Select a random config to distribute load
    $config = array_values($enabled_configs)[mt_rand(0, count($enabled_configs) - 1)];
    $cloud_name = trim($config['cloudName']);
    $upload_preset = trim($config['uploadPreset']);

    // 4. Determine resource type
    $mime_type = get_file_mime_type($file);
    $resource_type = strpos($mime_type, 'video/') === 0 ? 'video' : 'image';

    // 5. Upload
    $url = "https://api.cloudinary.com/v1_1/{$cloud_name}/{$resource_type}/upload";
    
    $client = new Client();
    try {
        $response = $client->post($url, [
            'multipart' => [
                [
                    'name' => 'upload_preset',
                    'contents' => $upload_preset
                ],
                [
                    'name' => 'file',
                    'contents' => fopen($file['tmp_name'], 'r'),
                    'filename' => $file['name']
                ]
            ]
        ]);

        $body = json_decode($response->getBody(), true);
        
        if (isset($body['secure_url'])) {
            if ($resource_type === 'video') {
                return ['imageUrl' => '', 'videoUrl' => $body['secure_url']];
            } else {
                return ['imageUrl' => $body['secure_url']];
            }
        } else {
             throw new Exception('Secure URL not found in Cloudinary response');
        }

    } catch (Exception $e) {
        error_log("Cloudinary upload failed: " . $e->getMessage());
        send_error('Cloudinary upload failed: ' . $e->getMessage(), 500);
        return null;
    }
}

function upload_to_tumblr($conn, $file) {
    // 1. Fetch Tumblr configurations from the database
    $result = $conn->query("SELECT setting_value FROM settings WHERE setting_key = 'tumblrConfigs'");
    $configs_json = $result ? $result->fetch_assoc()['setting_value'] : null;

    if (!$configs_json) {
        send_error('Tumblr configurations are not set on the server.', 500);
        return null;
    }

    $configs = json_decode($configs_json, true);
    if (!is_array($configs) || empty($configs)) {
        send_error('Tumblr configurations are invalid or empty.', 500);
        return null;
    }

    // 2. Filter for enabled configs
    $enabled_configs = array_filter($configs, function($config) {
        return !empty($config['enabled']);
    });

    if (empty($enabled_configs)) {
        send_error('No enabled Tumblr configurations found.', 500);
        return null;
    }
    
    // 3. Shuffle configurations to try random ones
    $enabled_configs = array_values($enabled_configs);
    shuffle($enabled_configs);

    $last_exception = null;
    
    foreach ($enabled_configs as $selected_config) {
        $consumer_key = $selected_config['consumerKey'] ?? null;
        $consumer_secret = $selected_config['consumerSecret'] ?? null;
        $token = $selected_config['token'] ?? null;
        $token_secret = $selected_config['tokenSecret'] ?? null;
        $blog_identifier = $selected_config['blogIdentifier'] ?? null;

        if (!$consumer_key || !$consumer_secret || !$token || !$token_secret || !$blog_identifier) {
            continue;
        }
        
        // Sanitize blog identifier (remove protocol and trailing slashes if present)
        $blog_identifier = preg_replace('#^https?://#', '', $blog_identifier);
        $blog_identifier = rtrim($blog_identifier, '/');
        
        $client = new Client();
        try {
            $file_type = get_file_mime_type($file);
            $is_video = strpos($file_type, 'video/') === 0;
            $post_type = $is_video ? 'video' : 'photo';
            
            $oauth_params = [
                'oauth_consumer_key' => $consumer_key,
                'oauth_nonce' => bin2hex(random_bytes(16)),
                'oauth_signature_method' => 'HMAC-SHA1',
                'oauth_timestamp' => time(),
                'oauth_token' => $token,
                'oauth_version' => '1.0',
            ];
            
            // Minimal required parameters for the post body
            $post_params = [
                'type' => $post_type,
                'state' => 'private' // Always private initially
            ];

            // FIX: OAuth 1.0a spec says: DO NOT include multipart body parameters in the signature base string.
            // Only query params (none here) and oauth_* params are signed.
            $params_for_signature = $oauth_params;
            
            uksort($params_for_signature, 'strcmp');
            $param_string_parts = [];
            foreach ($params_for_signature as $k => $v) {
                $param_string_parts[] = rawurlencode($k) . '=' . rawurlencode($v);
            }
            $param_string = implode('&', $param_string_parts);

            $http_method = 'POST';
            $base_url = "https://api.tumblr.com/v2/blog/{$blog_identifier}/post";
            $signature_base_string = $http_method . '&' . rawurlencode($base_url) . '&' . rawurlencode($param_string);
            $signing_key = rawurlencode($consumer_secret) . '&' . rawurlencode($token_secret);
            $signature = base64_encode(hash_hmac('sha1', $signature_base_string, $signing_key, true));
            
            $oauth_params_for_header = $oauth_params;
            $oauth_params_for_header['oauth_signature'] = $signature;
            
            $header_string = 'OAuth ';
            $header_parts = [];
            uksort($oauth_params_for_header, 'strcmp');
            foreach ($oauth_params_for_header as $k => $v) {
                $header_parts[] = rawurlencode($k) . '="' . rawurlencode($v) . '"';
            }
            $header_string .= implode(', ', $header_parts);
            
            $data_param_name = 'data';
            $multipart_data = [];
            // Add body parameters to multipart data
            foreach ($post_params as $key => $value) {
                $multipart_data[] = ['name' => $key, 'contents' => $value];
            }
            // Add file
            $multipart_data[] = [
                'name'     => $data_param_name,
                'contents' => fopen($file['tmp_name'], 'r'),
                'filename' => $file['name']
            ];
            
            $post_response = $client->post($base_url, [
                'headers' => ['Authorization' => $header_string],
                'multipart' => $multipart_data
            ]);

            $post_body = $post_response->getBody();
            $post_data = json_decode($post_body, true);

            if (!isset($post_data['response']['id'])) {
                throw new Exception('Tumblr post creation failed to return a post ID: ' . $post_body);
            }
            $new_post_id = $post_data['response']['id'];

            // FETCH URL Logic (GET request needs its own signature)
            $get_params = ['id' => $new_post_id];
            $get_oauth_params = [
                'oauth_consumer_key' => $consumer_key,
                'oauth_nonce' => bin2hex(random_bytes(16)),
                'oauth_signature_method' => 'HMAC-SHA1',
                'oauth_timestamp' => time(),
                'oauth_token' => $token,
                'oauth_version' => '1.0',
            ];

            $all_get_params_for_sig = array_merge($get_params, $get_oauth_params);
            uksort($all_get_params_for_sig, 'strcmp');

            $param_string_parts_get = [];
            foreach ($all_get_params_for_sig as $k => $v) {
                $param_string_parts_get[] = rawurlencode($k) . '=' . rawurlencode($v);
            }
            $param_string_get = implode('&', $param_string_parts_get);
            
            $http_method_get = 'GET';
            $base_url_get = "https://api.tumblr.com/v2/blog/{$blog_identifier}/posts"; 
            $signature_base_string_get = $http_method_get . '&' . rawurlencode($base_url_get) . '&' . rawurlencode($param_string_get);
            
            $signature_get = base64_encode(hash_hmac('sha1', $signature_base_string_get, $signing_key, true));
            $get_oauth_params['oauth_signature'] = $signature_get;
            
            $header_string_get = 'OAuth ';
            $header_parts_get = [];
            uksort($get_oauth_params, 'strcmp'); 
            foreach ($get_oauth_params as $k => $v) {
                $header_parts_get[] = rawurlencode($k) . '="' . rawurlencode($v) . '"';
            }
            $header_string_get .= implode(', ', $header_parts_get);

            $get_request_url = $base_url_get . '?' . http_build_query($get_params);
            $get_response = $client->get($get_request_url, ['headers' => ['Authorization' => $header_string_get]]);
            $get_data = json_decode($get_response->getBody(), true);

            if ($is_video) {
                if (isset($get_data['response']['posts'][0]['video_url'])) {
                    $video_url = $get_data['response']['posts'][0]['video_url'];
                    // Normalize Tumblr video URL to mp4 if possible
                    $video_url = str_replace(['.mov', 'v.tumblr.com'], ['.mp4', 'va.media.tumblr.com'], $video_url);
                    $thumbnail_url = $get_data['response']['posts'][0]['thumbnail_url'] ?? '';
                    return ['imageUrl' => $thumbnail_url, 'videoUrl' => $video_url];
                }
            } else {
                if (isset($get_data['response']['posts'][0]['photos'][0]['original_size']['url'])) {
                    $image_url = $get_data['response']['posts'][0]['photos'][0]['original_size']['url'];
                    return ['imageUrl' => $image_url, 'videoUrl' => null];
                }
            }
            throw new Exception('Failed to retrieve URL from Tumblr response.');

        } catch (Exception $e) {
            $last_exception = $e;
            error_log("Tumblr upload attempt failed: " . $e->getMessage());
            continue;
        }
    }
    
    send_error('All Tumblr upload attempts failed. Last error: ' . ($last_exception ? $last_exception->getMessage() : 'Unknown'), 500);
    return null;
}

function handle_upload($conn) {
    global $current_user_uid, $redis;

    // 1. SECURITY: Authentication Check
    if (!$current_user_uid) {
        send_error('Authentication required to upload files.', 401);
        return;
    }

    // 2. SECURITY: Rate Limiting
    check_upload_rate_limit($redis, $current_user_uid);

    // NEW: Handle Cloudflare R2 Presigned URL Generation
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_GET['action']) && $_GET['action'] === 'generate-r2-presigned-url') {
        // 1. Get request data from frontend
        $input = json_decode(file_get_contents('php://input'), true);
        $fileName = $input['fileName'] ?? null;
        $contentType = $input['contentType'] ?? null;
        $configId = $input['configId'] ?? null;

        if (!$fileName || !$contentType || !$configId) {
            send_error('Missing required parameters: fileName, contentType, or configId.', 400);
            return;
        }
        
        // 2. Fetch R2 configurations from database
        $result = $conn->query("SELECT setting_value FROM settings WHERE setting_key = 'r2Configs'");
        $configs_json = $result ? $result->fetch_assoc()['setting_value'] : null;
        $configs = $configs_json ? json_decode($configs_json, true) : [];
        
        $selected_config = null;
        if (is_array($configs)) {
            foreach ($configs as $config) {
                if ($config['id'] === $configId && !empty($config['enabled'])) {
                    $selected_config = $config;
                    break;
                }
            }
        }
        
        if (!$selected_config) {
            send_error('Cloudflare R2 configuration not found or is disabled.', 404);
            return;
        }

        // 3. Instantiate the S3 Client for R2
        try {
            // FIX: Suppress display_errors to prevent warnings (like open_basedir restrictions from AWS SDK)
            // from corrupting the JSON response. putenv() is disabled on this server.
            ini_set('display_errors', '0');
            
            $s3Client = new S3Client([
                'region' => 'auto',
                'version' => 'latest',
                'endpoint' => "https://{$selected_config['accountId']}.r2.cloudflarestorage.com",
                'credentials' => [
                    'key'    => $selected_config['accessKeyId'],
                    'secret' => $selected_config['secretAccessKey'],
                ],
                'use_path_style_endpoint' => true, // Use path style for better compatibility
            ]);

            // 4. Generate the presigned URL
            // Sanitize filename and create a unique name to prevent overwrites
            $safe_filename = preg_replace("/[^a-zA-Z0-9-_\.]/", "", basename($fileName));
            $unique_filename = uniqid() . '-' . $safe_filename;

            $cmd = $s3Client->getCommand('PutObject', [
                'Bucket' => $selected_config['bucketName'],
                'Key'    => $unique_filename,
                'ContentType' => $contentType,
            ]);
            
            // Generate the request with a 15-minute expiration
            $request = $s3Client->createPresignedRequest($cmd, '+15 minutes');
            
            // Get the actual presigned URL as a string
            $presignedUrl = (string)$request->getUri();
            
            // 5. Construct the final public URL for storage in the DB
            $publicUrlBase = rtrim($selected_config['publicUrl'], '/');
            $finalUrl = $publicUrlBase . '/' . $unique_filename;
            
            // 6. Send the URLs back to the frontend
            send_json([
                'uploadUrl' => $presignedUrl,
                'finalUrl' => $finalUrl
            ]);

        } catch (S3Exception $e) {
            send_error('Could not generate R2 presigned URL: ' . $e->getAwsErrorMessage(), 500);
        } catch (Exception $e) {
            send_error('An unexpected error occurred: ' . $e->getMessage(), 500);
        }
        return; // Important: Stop execution here
    }


    // --- Existing File Upload Logic ---
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        send_error('Method not allowed', 405);
        return;
    }
    
    $provider = $_GET['provider'] ?? 'server';

    try {
        if (!isset($_FILES['image'])) {
            send_error('No image file uploaded.', 400);
            return;
        }

        $file = $_FILES['image'];

        if ($file['error'] !== UPLOAD_ERR_OK) {
            send_error('File upload error code: ' . $file['error'], 500);
            return;
        }

        // --- SECURITY: Strict validation ---
        $allowed_extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov'];
        $allowed_mimes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp', 
            'video/mp4', 'video/webm', 'video/quicktime'
        ];

        // 1. Check extension
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($extension, $allowed_extensions)) {
            send_error('Invalid file extension.', 400);
            return;
        }

        // 2. Check MIME type (use robust detection)
        $detected_mime = get_file_mime_type($file);
        if (!in_array($detected_mime, $allowed_mimes)) {
             // Double check for browser mime if detection fails (e.g. some servers don't have magic db)
             // But rely on extension mapping as fallback in get_file_mime_type
             send_error('Invalid file type detected: ' . $detected_mime, 400);
             return;
        }
        
        // 3. Check image content (for images) to prevent polyglots
        if (strpos($detected_mime, 'image/') === 0 && $extension !== 'webp') {
            if (!getimagesize($file['tmp_name'])) {
                 send_error('File is not a valid image.', 400);
                 return;
            }
        }

        // 4. SECURITY: Content scanning for PHP tags (Web Shell Prevention)
        // Read the first few kilobytes and search for PHP opening tags
        $content = file_get_contents($file['tmp_name'], false, null, 0, 4096);
        if (strpos($content, '<?php') !== false || strpos($content, '<?=') !== false || stripos($content, '<script language=\'php\'>') !== false) {
            send_error('Security Violation: File contains prohibited code.', 400);
            return;
        }

        // 5. Check Size
        $max_size_mb = 10;
        $result = $conn->query("SELECT setting_value FROM settings WHERE setting_key = 'imageUploadMaxSizeMb'");
        if ($result && $row = $result->fetch_assoc()) {
            $max_size_mb = (int)$row['setting_value'];
        }
        if ($max_size_mb <= 0) $max_size_mb = 10;

        if ($file['size'] > $max_size_mb * 1024 * 1024) {
            send_error("File is too large. Maximum size is {$max_size_mb}MB.", 400);
            return;
        }
        
        $file_urls = null;
        if ($provider === 'tumblr') {
            $file_urls = upload_to_tumblr($conn, $file);
        } elseif ($provider === 'cloudinary') {
            $file_urls = upload_to_cloudinary($conn, $file);
        } else { // Default to local 'server' upload
            $root_upload_dir = 'uploads/';
            
            // Create .htaccess to prevent script execution
            if (!file_exists($root_upload_dir . '.htaccess')) {
                if (!is_dir($root_upload_dir) && !mkdir($root_upload_dir, 0755, true)) {
                     send_error('Failed to create root uploads directory. Check server permissions.', 500);
                     return;
                }
                file_put_contents($root_upload_dir . '.htaccess', "Options -Indexes\nSetHandler text/plain\n<FilesMatch \"\.(php|phtml|php5|html|js)$\">\n Order Deny,Allow\n Deny from all\n</FilesMatch>");
            }

            $date_dir = date('Y') . '/' . date('m') . '/';
            $upload_dir = $root_upload_dir . $date_dir;
            
            if (!is_dir($upload_dir)) {
                if (!mkdir($upload_dir, 0755, true)) {
                    send_error('Failed to create daily upload directory. Check server permissions.', 500);
                    return;
                }
            }
            
            // 6. Randomize Filename
            $new_filename = bin2hex(random_bytes(16)) . '.' . $extension;
            $destination_path = $upload_dir . $new_filename;
            
            if (move_uploaded_file($file['tmp_name'], $destination_path)) {
                $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
                $host = $_SERVER['HTTP_HOST'];
                $base_path = dirname($_SERVER['SCRIPT_NAME']);
                if ($base_path === '/' || $base_path === '.') $base_path = '';
                
                $file_url = $protocol . $host . $base_path . '/' . $destination_path;
                $is_video = strpos($detected_mime, 'video/') === 0;
                
                $file_urls = [
                    'imageUrl' => $is_video ? '' : $file_url,
                    'videoUrl' => $is_video ? $file_url : null,
                ];
            } else {
                send_error('Failed to move uploaded file. Check server permissions.', 500);
            }
        }
        
        if ($file_urls) {
            send_json($file_urls);
        }
    } catch (Throwable $e) {
        send_error('An unexpected server error occurred: ' . $e->getMessage(), 500);
    }
}
