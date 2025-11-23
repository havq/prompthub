
<?php
// api/upload.php

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
        
        $caption = ''.time();
        $tags = 'girls,girl,beautiful';
        $is_adult = true;

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
            
            $post_params = ['type' => $post_type];
            $post_params['state'] = 'private'; 
            if ($caption) $post_params['caption'] = $caption;
            if ($tags) $post_params['tags'] = $tags;
            if ($is_adult) {
                $post_params['content_rating'] = 'nsfw';
                $post_params['content_advisory'] = 'nudity';
                $post_params['content_advisory'] = 'sexual_themes';
            }

            $params_for_signature = array_merge($oauth_params, $post_params);
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
            foreach ($post_params as $key => $value) {
                $multipart_data[] = ['name' => $key, 'contents' => $value];
            }
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

            // FETCH URL Logic
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
?>
