<?php
// api/mail.php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

/**
 * Lấy cấu hình SMTP từ database
 */
function get_smtp_config() {
    global $conn;
    if (!$conn) return null;

    $result = $conn->query("SELECT setting_value FROM settings WHERE setting_key = 'smtpConfig'");
    if (!$result) return null;

    $config_json = $result->fetch_assoc()['setting_value'] ?? null;
    
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
            
            // Enhanced Encryption Logic
            $encryption = $config['encryption'] ?? 'tls';
            if ($encryption === 'ssl') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            } elseif ($encryption === 'tls') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            } else {
                $mail->SMTPSecure = '';
                $mail->SMTPAutoTLS = false;
            }

            $port = $config['port'] ?? 587;
            $mail->Port = (int)$port;
            
            // Charset settings
            $mail->CharSet = 'UTF-8';
            $mail->Encoding = 'base64';

            // Sender Logic
            $fromEmail = !empty($config['fromEmail']) ? $config['fromEmail'] : $config['username'];
            // Fallback if username is not an email (e.g. API keys)
            if (!filter_var($fromEmail, FILTER_VALIDATE_EMAIL)) {
                 $domain = $_SERVER['SERVER_NAME'] ?? 'localhost';
                 $fromEmail = "no-reply@$domain";
            }

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
            // Fallback to native mail() if SMTP fails
            return send_mail_native($to, $subject, $body);
        }
    } else {
        // Fallback to native PHP mail()
        return send_mail_native($to, $subject, $body);
    }
}

function send_mail_native($to, $subject, $body) {
    $appName = 'Prompthub';
    
    // Determine a safe sender email based on the current domain
    $domain = $_SERVER['SERVER_NAME'] ?? 'prompthub.today';
    $domain = preg_replace('/[^a-zA-Z0-9.-]/', '', $domain);
    if (empty($domain)) $domain = 'localhost';
    
    $senderEmail = "no-reply@$domain";

    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= "From: $appName <$senderEmail>" . "\r\n";
    $headers .= "Reply-To: $senderEmail" . "\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();

    return mail($to, $subject, $body, $headers);
}
?>