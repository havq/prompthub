<?php
use GuzzleHttp\Client;

function upload_to_cloudinary($conn, $file) {
    $result = $conn->query("SELECT setting_value FROM settings WHERE setting_key = 'cloudinaryConfigs'");
    $configs_json = $result ? $result->fetch_assoc()['setting_value'] : null;
    $configs = $configs_json ? json_decode($configs_json, true) : [];

    $enabled_configs = array_filter($configs, function($config) {
        return !empty($config['enabled']) && !empty($config['cloudName']) && !empty($config['uploadPreset']);
    });

    if (empty($enabled_configs)) {
        send_error('No enabled Cloudinary configurations found.', 500);
    }

    $config = array_values($enabled_configs)[mt_rand(0, count($enabled_configs) - 1)];
    $cloud_name = trim($config['cloudName']);
    $upload_preset = trim($config['uploadPreset']);

    $mime_type = get_file_mime_type($file);
    $resource_type = strpos($mime_type, 'video/') === 0 ? 'video' : 'image';

    $url = "https://api.cloudinary.com/v1_1/{$cloud_name}/{$resource_type}/upload";
    
    $postFields = [
        'upload_preset' => $upload_preset,
        'file' => new CURLFile($file['tmp_name'], $mime_type, $file['name'])
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);

    $body = json_decode($response, true);
    
    if (isset($body['secure_url'])) {
        if ($resource_type === 'video') {
            return ['imageUrl' => '', 'videoUrl' => $body['secure_url']];
        } else {
            return ['imageUrl' => $body['secure_url']];
        }
    } else {
         error_log("Cloudinary error: " . $response);
         send_error('Cloudinary upload failed.', 500);
    }
}
?>