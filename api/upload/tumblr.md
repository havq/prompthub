<?php
use GuzzleHttp\Client;

function upload_to_tumblr($conn, $file) {
    $result = $conn->query("SELECT setting_value FROM settings WHERE setting_key = 'tumblrConfigs'");
    $configs_json = $result ? $result->fetch_assoc()['setting_value'] : null;
    $configs = $configs_json ? json_decode($configs_json, true) : [];
    
    $enabled_configs = array_filter($configs, function($config) { return !empty($config['enabled']); });
    if (empty($enabled_configs)) send_error('No enabled Tumblr configs.', 500);
    
    $config = array_values($enabled_configs)[array_rand($enabled_configs)];
    
    $consumer_key = $config['consumerKey'];
    $consumer_secret = $config['consumerSecret'];
    $token = $config['token'];
    $token_secret = $config['tokenSecret'];
    $blog_identifier = $config['blogIdentifier'];
    $blog_identifier = preg_replace('#^https?://#', '', $blog_identifier);
    $blog_identifier = rtrim($blog_identifier, '/');

    $file_type = get_file_mime_type($file);
    $is_video = strpos($file_type, 'video/') === 0;
    $post_type = $is_video ? 'video' : 'photo';
    
    // OAuth 1.0a Signature Generation
    $oauth_params = [
        'oauth_consumer_key' => $consumer_key,
        'oauth_nonce' => bin2hex(random_bytes(16)),
        'oauth_signature_method' => 'HMAC-SHA1',
        'oauth_timestamp' => time(),
        'oauth_token' => $token,
        'oauth_version' => '1.0',
    ];
    
    // For signature base string, only sort and stringify oauth params (no multipart body params)
    $base_params = $oauth_params;
    uksort($base_params, 'strcmp');
    $query_string = [];
    foreach ($base_params as $k => $v) { $query_string[] = rawurlencode($k) . '=' . rawurlencode($v); }
    $param_string = implode('&', $query_string);

    $base_url = "https://api.tumblr.com/v2/blog/{$blog_identifier}/post";
    $base_string = "POST&" . rawurlencode($base_url) . "&" . rawurlencode($param_string);
    $signing_key = rawurlencode($consumer_secret) . '&' . rawurlencode($token_secret);
    $signature = base64_encode(hash_hmac('sha1', $base_string, $signing_key, true));
    $oauth_params['oauth_signature'] = $signature;

    // Build Authorization Header
    $header_parts = [];
    foreach ($oauth_params as $k => $v) { $header_parts[] = $k . '="' . rawurlencode($v) . '"'; }
    $auth_header = 'OAuth ' . implode(', ', $header_parts);

    // Upload
    $postFields = [
        'type' => $post_type,
        'state' => 'private',
        'data' => new CURLFile($file['tmp_name'], $file_type, $file['name'])
    ];

    $ch = curl_init($base_url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: ' . $auth_header]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $data = json_decode($response, true);
    
    if ($httpCode !== 201 || !isset($data['response']['id'])) {
        error_log("Tumblr Error: $response");
        send_error("Tumblr upload failed ($httpCode).", 500);
    }

    // To get the URL, we must fetch the created post
    $postId = $data['response']['id'];
    
    // New request for GET post
    $oauth_params['oauth_nonce'] = bin2hex(random_bytes(16));
    $oauth_params['oauth_timestamp'] = time();
    unset($oauth_params['oauth_signature']);
    
    $get_params = ['id' => $postId];
    $sig_params = array_merge($oauth_params, $get_params);
    uksort($sig_params, 'strcmp');
    $qs = []; foreach ($sig_params as $k => $v) { $qs[] = rawurlencode($k) . '=' . rawurlencode($v); }
    
    $get_url_base = "https://api.tumblr.com/v2/blog/{$blog_identifier}/posts";
    $base_string_get = "GET&" . rawurlencode($get_url_base) . "&" . rawurlencode(implode('&', $qs));
    $signature_get = base64_encode(hash_hmac('sha1', $base_string_get, $signing_key, true));
    $oauth_params['oauth_signature'] = $signature_get;
    
    $auth_header_get = 'OAuth ' . implode(', ', array_map(
        function($v, $k) { return $k . '="' . rawurlencode($v) . '"'; },
        $oauth_params,
        array_keys($oauth_params)
    ));

    $ch = curl_init($get_url_base . "?id=" . $postId);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: ' . $auth_header_get]);
    $get_res = curl_exec($ch);
    curl_close($ch);
    
    $postData = json_decode($get_res, true);
    $posts = $postData['response']['posts'] ?? [];
    
    if (empty($posts)) send_error('Failed to retrieve Tumblr post URL.', 500);
    
    $post = $posts[0];
    if ($is_video) {
         return ['imageUrl' => $post['thumbnail_url'] ?? '', 'videoUrl' => $post['video_url'] ?? ''];
    } else {
         return ['imageUrl' => $post['photos'][0]['original_size']['url'] ?? ''];
    }
}
?>