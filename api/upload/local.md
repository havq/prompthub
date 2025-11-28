<?php
function upload_to_local($file) {
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $root_upload_dir = 'uploads/';
    
    if (!file_exists($root_upload_dir)) mkdir($root_upload_dir, 0755, true);
    
    $date_dir = date('Y') . '/' . date('m') . '/';
    $upload_dir = $root_upload_dir . $date_dir;
    if (!is_dir($upload_dir)) mkdir($upload_dir, 0755, true);
    
    $new_filename = bin2hex(random_bytes(16)) . '.' . $extension;
    $destination_path = $upload_dir . $new_filename;
    
    if (move_uploaded_file($file['tmp_name'], $destination_path)) {
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
        $host = $_SERVER['HTTP_HOST'];
        $base_path = dirname($_SERVER['SCRIPT_NAME']);
        if ($base_path === '/' || $base_path === '.') $base_path = '';
        
        $file_url = $protocol . $host . $base_path . '/' . $destination_path;
        $mime = get_file_mime_type(['tmp_name' => $destination_path, 'name' => $new_filename]);
        $is_video = strpos($mime, 'video/') === 0;
        
        return [
            'imageUrl' => $is_video ? '' : $file_url,
            'videoUrl' => $is_video ? $file_url : null,
        ];
    } else {
        send_error('Failed to move uploaded file.', 500);
        return null;
    }
}
?>