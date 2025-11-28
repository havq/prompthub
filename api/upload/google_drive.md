<?php
function refresh_google_token($conn, $refresh_token, $client_id, $client_secret) {
    $url = 'https://oauth2.googleapis.com/token';
    $params = [
        'client_id' => $client_id,
        'client_secret' => $client_secret,
        'refresh_token' => $refresh_token,
        'grant_type' => 'refresh_token'
    ];
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);
    $data = json_decode($response, true);
    if (isset($data['access_token'])) {
        $new_access_token = $data['access_token'];
        $expires_in = $data['expires_in'];
        $new_expiry = time() + $expires_in;
        
        $stmt = $conn->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
        
        $k1 = 'bloggerAccessToken'; $stmt->bind_param("ss", $k1, $new_access_token); $stmt->execute();
        $k2 = 'bloggerTokenExpiry'; $stmt->bind_param("ss", $k2, $new_expiry); $stmt->execute();
        
        return $new_access_token;
    }
    return null;
}

function upload_to_blogger($conn, $file) {
    // 1. Get Tokens
    $stmt = $conn->prepare("SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('bloggerAccessToken', 'bloggerRefreshToken', 'bloggerTokenExpiry', 'googleClientId', 'googleClientSecret')");
    $stmt->execute();
    $result = $stmt->get_result();
    $creds = [];
    while($row = $result->fetch_assoc()) {
        $creds[$row['setting_key']] = $row['setting_value'];
    }

    $accessToken = $creds['bloggerAccessToken'] ?? null;
    $refreshToken = $creds['bloggerRefreshToken'] ?? null;
    $expiry = $creds['bloggerTokenExpiry'] ?? 0;
    $clientId = $creds['googleClientId'] ?? null;
    $clientSecret = $creds['googleClientSecret'] ?? null;

    if (!$refreshToken) {
        send_error('Google Drive is not authorized. Please connect in settings.', 400);
        return null;
    }

    // 2. Refresh Token if needed (or if close to expiry)
    if (time() >= ($expiry - 60) || !$accessToken) { 
        if (!$clientId || !$clientSecret) {
             send_error('Missing Google Client ID/Secret to refresh token.', 500);
        }
        $accessToken = refresh_google_token($conn, $refreshToken, $clientId, $clientSecret);
        if (!$accessToken) {
            send_error('Failed to refresh Google access token. Please re-authorize in Admin Settings.', 401);
        }
    }

    // 3. Upload to Google Drive (Multipart)
    $uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    
    $mimeType = get_file_mime_type($file);
    $metadata = [
        'name' => $file['name'],
        'mimeType' => $mimeType
    ];
    
    $boundary = '-------' . md5(time());
    $file_content = file_get_contents($file['tmp_name']);

    $post_data = "--$boundary\r\n" .
                 "Content-Type: application/json; charset=UTF-8\r\n\r\n" .
                 json_encode($metadata) . "\r\n" .
                 "--$boundary\r\n" .
                 "Content-Type: $mimeType\r\n\r\n" .
                 $file_content . "\r\n" .
                 "--$boundary--\r\n";

    $headers = [
        "Authorization: Bearer $accessToken",
        "Content-Type: multipart/related; boundary=$boundary",
        "Content-Length: " . strlen($post_data)
    ];

    $ch = curl_init($uploadUrl);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        error_log("Google Drive Upload Failed (Code $httpCode): " . $response);
        send_error("Google Drive upload failed with code $httpCode. Please check Authorization.", 502);
    }

    $fileData = json_decode($response, true);
    $fileId = $fileData['id'] ?? null;

    if (!$fileId) {
        send_error('Failed to get file ID from Google Drive response.', 500);
    }

    // 4. Make File Public
    $permUrl = "https://www.googleapis.com/drive/v3/files/$fileId/permissions";
    $permData = json_encode(["role" => "reader", "type" => "anyone"]);
    
    $ch = curl_init($permUrl);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $permData);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer $accessToken",
        "Content-Type: application/json"
    ]);
    curl_exec($ch);
    curl_close($ch);

    // 5. Generate Direct Link
    if (strpos($mimeType, 'image/') === 0) {
        return ['imageUrl' => "https://lh3.googleusercontent.com/d/$fileId=s2000"];
    } else {
        // For videos/others, fetch fields
        $getUrl = "https://www.googleapis.com/drive/v3/files/$fileId?fields=webContentLink";
        $ch = curl_init($getUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer $accessToken"]);
        $metaResponse = curl_exec($ch);
        curl_close($ch);
        $metaData = json_decode($metaResponse, true);
        
        if (isset($metaData['webContentLink'])) {
             return ['imageUrl' => $metaData['webContentLink']];
        }
        return ['imageUrl' => "https://drive.google.com/uc?export=download&id=$fileId"];
    }
}
?>