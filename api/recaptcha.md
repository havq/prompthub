<?php
// api/recaptcha.md

function handle_recaptcha($conn, $method, $post_data) {
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }

    if ($method !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method Not Allowed']);
        exit();
    }
    
    if (file_exists('../vendor/autoload.php')) {
        require_once '../vendor/autoload.php';
    }
    use GuzzleHttp\Client;

    $token = $post_data['token'] ?? null;
    $version = $post_data['version'] ?? null;

    if (!$token || !$version) {
        http_response_code(400);
        echo json_encode(['error' => 'Token and version are required.']);
        exit();
    }

    // Fetch reCAPTCHA settings from the database
    $result = $conn->query("SELECT setting_value FROM settings WHERE setting_key = 'recaptchaSettings'");
    $config_json = $result ? $result->fetch_assoc()['setting_value'] : null;
    if (!$config_json) {
        http_response_code(500);
        echo json_encode(['error' => 'reCAPTCHA settings not found on the server.']);
        exit();
    }
    
    $settings = json_decode($config_json, true);
    if (!is_array($settings) || empty($settings['enabled'])) {
        http_response_code(500);
        echo json_encode(['error' => 'reCAPTCHA is not enabled on the server.']);
        exit();
    }

    $secretKey = ($version === 'v2') ? ($settings['v2SecretKey'] ?? null) : ($settings['v3SecretKey'] ?? null);

    if (empty($secretKey)) {
        http_response_code(500);
        echo json_encode(['error' => 'reCAPTCHA secret key is not set on the server for version ' . $version]);
        exit();
    }

    $verify_url = 'https://www.google.com/recaptcha/api/siteverify';

    try {
        if (class_exists('GuzzleHttp\Client')) {
            $client = new Client();
            $response = $client->post($verify_url, [
                'form_params' => [
                    'secret'   => $secretKey,
                    'response' => $token,
                    'remoteip' => $_SERVER['REMOTE_ADDR'] ?? null
                ]
            ]);
            $body = json_decode($response->getBody(), true);
        } else {
            $data = http_build_query([
                'secret'   => $secretKey,
                'response' => $token,
                'remoteip' => $_SERVER['REMOTE_ADDR'] ?? null
            ]);
            $options = [
                'http' => [
                    'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
                    'method'  => 'POST',
                    'content' => $data
                ]
            ];
            $context = stream_context_create($options);
            $result = file_get_contents($verify_url, false, $context);
            if ($result === FALSE) {
                throw new Exception('Failed to connect to Google reCAPTCHA service.');
            }
            $body = json_decode($result, true);
        }

        if ($body && isset($body['success'])) {
            if ($body['success'] === true) {
                http_response_code(200);
                echo json_encode(['success' => true, 'message' => 'reCAPTCHA verified successfully.']);
            } else {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'reCAPTCHA verification failed.',
                    'error-codes' => $body['error-codes'] ?? []
                ]);
            }
        } else {
            throw new Exception('Invalid response from Google reCAPTCHA service.');
        }

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Server error during reCAPTCHA verification: ' . $e->getMessage()]);
    }
}
?>