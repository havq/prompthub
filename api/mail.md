<?php
// api/mail.php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

/**
 * Lấy cấu hình SMTP từ database
 */
function get_smtp_config() {
    global $conn;
    $result = $conn->query("SELECT setting_value FROM settings WHERE setting_key = 'smtpConfig'");
    $config_json = $result ? $result->fetch_assoc()['setting_value'] : null;
    
    if ($config_json) {
        return json_decode($config_json, true);
    }
    return null;
}

/**
 * Hàm gửi email sử dụng PHPMailer với cấu hình SMTP động từ database.
 * Fallback về mail() nếu không có cấu hình hoặc lỗi.
 */
function send_mail_custom($to, $subject, $body) {
    $config = get_smtp_config();

    // Nếu có cấu hình SMTP và được bật
    if ($config && !empty($config['enabled']) && !empty($config['host'])) {
        $mail = new PHPMailer(true);

        try {
            // Server settings
            $mail->isSMTP();
            $mail->Host       = $config['host'];
            $mail->SMTPAuth   = true;
            $mail->Username   = $config['username'];
            $mail->Password   = $config['password'];
            $mail->SMTPSecure = $config['encryption'] === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = (int)$config['port'];
            
            // Charset settings
            $mail->CharSet = 'UTF-8';
            $mail->Encoding = 'base64';

            // Recipients
            $fromEmail = !empty($config['fromEmail']) ? $config['fromEmail'] : $config['username'];
            $fromName = !empty($config['fromName']) ? $config['fromName'] : 'Prompthub';
            
            $mail->setFrom($fromEmail, $fromName);
            $mail->addAddress($to);

            // Content
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body    = $body;
            $mail->AltBody = strip_tags($body);

            $mail->send();
            return true;
        } catch (Exception $e) {
            error_log("Message could not be sent. Mailer Error: {$mail->ErrorInfo}");
            // Fallback to native mail() if SMTP fails? 
            // Usually better to fail loudly or log, but let's try native as last resort if configured.
            return send_mail_native($to, $subject, $body);
        }
    } else {
        // Fallback to native PHP mail()
        return send_mail_native($to, $subject, $body);
    }
}

function send_mail_native($to, $subject, $body) {
    $appName = 'Prompthub';
    $senderEmail = 'no-reply@prompthub.today';

    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= "From: $appName <$senderEmail>" . "\r\n";
    $headers .= "Reply-To: $senderEmail" . "\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();

    return mail($to, $subject, $body, $headers);
}
?>