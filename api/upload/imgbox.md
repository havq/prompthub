<?php
function upload_to_imgbox($file) {
    $ch = curl_init();
    // Use a temp file for cookies to ensure proper session handling
    $cookie_file = tempnam(sys_get_temp_dir(), 'imgbox_cookie');

    // 1. Fetch homepage to get token and cookies
    curl_setopt($ch, CURLOPT_URL, 'https://imgbox.com/');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_COOKIEJAR, $cookie_file);
    curl_setopt($ch, CURLOPT_COOKIEFILE, $cookie_file);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    $response = curl_exec($ch);

    if (curl_errno($ch) || !$response) {
        curl_close($ch);
        @unlink($cookie_file);
        send_error('Failed to connect to imgbox: ' . curl_error($ch), 502);
    }

    // Extract Authenticity Token
    $token = null;
    if (preg_match('/<meta name="csrf-token" content="([^"]+)"/', $response, $matches)) {
        $token = $matches[1];
    } elseif (preg_match('/name="authenticity_token" value="([^"]+)"/', $response, $matches)) {
        $token = $matches[1];
    }

    if (!$token) {
        curl_close($ch);
        @unlink($cookie_file);
        // Check for Cloudflare or other blocks
        if (strpos($response, 'Just a moment...') !== false || strpos($response, 'Challenge') !== false) {
            send_error('Imgbox upload failed: Cloudflare protection detected.', 500);
        }
        send_error('Failed to get imgbox token.', 500);
    }

    // Extract Gallery ID/Token ID (often required)
    $gallery_id = '';
    if (preg_match('/name="gallery_id" value="([^"]+)"/', $response, $matches)) {
        $gallery_id = $matches[1];
    }

    // 2. Upload File
    // Imgbox usually uses 'content_type' 1 for Family Safe
    $postFields = [
        'token_id' => $gallery_id,
        'authenticity_token' => $token,
        'files[]' => new CURLFile($file['tmp_name'], get_file_mime_type($file), $file['name']),
        'content_type' => 1, 
        'thumbnail_size' => '100c', 
        'comments_enabled' => 0,
    ];

    curl_setopt($ch, CURLOPT_URL, 'https://imgbox.com/upload/process');
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
    // Ajax headers are important for the JSON response
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'X-Requested-With: XMLHttpRequest',
        'Origin: https://imgbox.com',
        'Referer: https://imgbox.com/'
    ]);
    
    $uploadResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    curl_close($ch);
    @unlink($cookie_file);
    
    if ($httpCode !== 200 || !$uploadResponse) {
        error_log("Imgbox Upload Failed ($httpCode): " . $uploadResponse);
        send_error("Imgbox upload failed (HTTP $httpCode).", 502);
    }

    $json = json_decode($uploadResponse, true);
    
    // Check for array of files response
    if (isset($json['files'][0])) {
        $fileData = $json['files'][0];
        
        // Construct high-res image URL from thumbnail URL if possible
        // Thumbnail: https://thumbs2.imgbox.com/a1/b2/ID_t.jpg
        // Original:  https://images2.imgbox.com/a1/b2/ID_o.jpg
        if (isset($fileData['thumbnail_url'])) {
             $thumb = $fileData['thumbnail_url'];
             $full = str_replace('thumbs', 'images', $thumb);
             $full = str_replace('_t.', '_o.', $full);
             return ['imageUrl' => $full];
        }
        
        if (isset($fileData['url'])) {
            return ['imageUrl' => $fileData['url']];
        }
    }
    
    // Check for plain text response (fallback)
    $url = trim($uploadResponse);
    if (filter_var($url, FILTER_VALIDATE_URL)) {
         return ['imageUrl' => $url];
    }

    error_log("Imgbox Unexpected Response: " . $uploadResponse);
    send_error('Failed to parse Imgbox response.', 500);
    return null;
}
?>