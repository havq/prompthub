<?php
// api/sepay.php

use GuzzleHttp\Client;

function handle_sepay($conn, $method, $get_params, $post_data) {
    global $current_user_uid;
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

    if ($method !== 'POST') {
        send_error('Method not allowed.', 405);
        return;
    }

    $action = $get_params['action'] ?? null;

    if ($action === 'create_payment') {
        handle_create_payment($conn, $post_data, $current_user_uid);
    } elseif ($action === 'verify_payment') {
        handle_verify_payment($conn, $post_data);
    } elseif ($action === 'ipn') {
        // For IPN, data comes from the raw input stream
        $ipn_data = json_decode(file_get_contents('php://input'), true);
        handle_ipn($conn, $ipn_data);
    } else {
        send_error('Invalid action for SePay resource.', 400);
    }
}

function get_sepay_config($conn) {
    $result = $conn->query("SELECT setting_value FROM settings WHERE setting_key = 'sepayConfig'");
    $config_json = $result ? $result->fetch_assoc()['setting_value'] : null;
    if (!$config_json) return null;

    $config = json_decode($config_json, true);
    if (!is_array($config)) return null;

    if (!empty($config['enabled']) && !empty($config['storeId']) && !empty($config['secretKey'])) {
        return [
            'store_id' => $config['storeId'],
            'secret_key' => $config['secretKey']
        ];
    }
    return null;
}

function handle_create_payment($conn, $post_data, $current_user_uid) {
    if (!$current_user_uid) {
        send_error('Authentication required.', 401);
        return;
    }

    $config = get_sepay_config($conn);
    if (!$config) {
        send_error('SePay is not configured or enabled on the server.', 500);
        return;
    }

    $stmt = $conn->prepare("SELECT username, email FROM users WHERE uid = ?");
    $stmt->bind_param("s", $current_user_uid);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    if (!$user) {
        send_error('User not found.', 404);
        return;
    }

    $order_code = 'PRO-' . strtoupper(substr($current_user_uid, 0, 5)) . time();
    $trans_amount = (int)($post_data['amount'] ?? 99000);
    $trans_content = $post_data['content'] ?? 'Pro Membership Upgrade';
    
    // Fetch appUrl and routerMode from settings
    $settings_result = $conn->query("SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('appUrl', 'routerMode')");
    $settings = [];
    while ($row = $settings_result->fetch_assoc()) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }

    // Determine the base URL for the frontend application
    $app_url = $settings['appUrl'] ?? null;
    if (empty($app_url)) {
        // Fallback to detecting from server variables if not set in admin
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
        $host = $_SERVER['HTTP_HOST'];
        $app_url = $protocol . $host;
    }
    $app_url = rtrim($app_url, '/'); // Ensure no trailing slash

    // Determine the router mode
    $router_mode = $settings['routerMode'] ?? 'hash';
    
    $return_path = ($router_mode === 'browser') ? '/payment-status' : '/#/payment-status';
    $frontend_url = $app_url . $return_path;

    // Construct the IPN URL based on the API's location
    $base_url = rtrim((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]", '/');
    $script_path = dirname($_SERVER['SCRIPT_NAME']);
    $api_base_url = $base_url . ($script_path == '/' ? '' : $script_path);
    $api_url = rtrim($api_base_url, '/') . '/api.php?resource=sepay&action=ipn';


    $request_data = [
        "store_id" => $config['store_id'],
        "order_code" => $order_code,
        "trans_amount" => $trans_amount,
        "trans_content" => $trans_content,
        "return_url" => $frontend_url,
        "ipn_url" => $api_url,
        "customer_name" => $user['username'] ?? 'N/A',
        "customer_email" => $user['email'] ?? '',
        "customer_phone" => ''
    ];

    $data_string = $request_data['ipn_url'] . '|' . $request_data['order_code'] . '|' . $request_data['return_url'] . '|' . $request_data['store_id'] . '|' . $request_data['trans_amount'] . '|' . $request_data['trans_content'];
    $checksum = hash('sha256', $config['secret_key'] . '|' . $data_string);
    $request_data['checksum'] = $checksum;

    try {
        $client = new Client();
        $response = $client->post('https://sepay.vn/api/v1/payment/create', [
            'json' => $request_data
        ]);

        $body = json_decode($response->getBody(), true);

        if (isset($body['status']) && $body['status'] == 1 && isset($body['data']['payment_url'])) {
            // Store pending transaction in the database
            $stmt = $conn->prepare("INSERT INTO sepay_transactions (order_code, user_id, amount, content) VALUES (?, ?, ?, ?)");
            $stmt->bind_param("ssis", $order_code, $current_user_uid, $trans_amount, $trans_content);
            $stmt->execute();

            send_json(['paymentUrl' => $body['data']['payment_url']]);
        } else {
            send_error($body['msg'] ?? 'Failed to create payment order with SePay.', 500);
        }
    } catch (Exception $e) {
        send_error('Could not connect to SePay service: ' . $e->getMessage(), 503);
    }
}

function handle_verify_payment($conn, $post_data) {
    $config = get_sepay_config($conn);
    if (!$config) {
        send_error('SePay configuration error.', 500);
        return;
    }

    $trans_id = $post_data['trans_id'];
    $order_code = $post_data['order_code'];
    $status = $post_data['status'];
    $checksum = $post_data['checksum'];

    $data_string = $order_code . '|' . $status . '|' . $trans_id;
    $expected_checksum = hash('sha256', $config['secret_key'] . '|' . $data_string);

    if ($checksum !== $expected_checksum) {
        send_error('Invalid checksum. Payment verification failed.', 400);
        return;
    }

    if ($status === 'SUCCESS') {
        $result = upgrade_user_from_order($conn, $order_code, $trans_id);
        if ($result) {
            send_json(['success' => true]);
        } else {
            // This might happen if IPN processed it first. Check status before erroring.
            $stmt = $conn->prepare("SELECT status FROM sepay_transactions WHERE order_code = ?");
            $stmt->bind_param("s", $order_code);
            $stmt->execute();
            $transaction = $stmt->get_result()->fetch_assoc();
            if ($transaction && $transaction['status'] === 'success') {
                send_json(['success' => true]);
            } else {
                send_error('Failed to process order.', 500);
            }
        }
    } else {
        send_error('Payment was not successful.', 400);
    }
}

function handle_ipn($conn, $post_data) {
    $config = get_sepay_config($conn);
    if (!$config) {
        error_log('SePay IPN failed: Configuration not found.');
        send_json(['status' => 0, 'msg' => 'Configuration error']);
        return;
    }
    
    if (!$post_data) {
        error_log('SePay IPN failed: Invalid JSON payload.');
        send_json(['status' => 0, 'msg' => 'Invalid payload']);
        return;
    }
    
    $trans_id = $post_data['trans_id'];
    $order_code = $post_data['order_code'];
    $status = $post_data['status'];
    $checksum = $post_data['checksum'];

    $data_string = $order_code . '|' . $status . '|' . $trans_id;
    $expected_checksum = hash('sha256', $config['secret_key'] . '|' . $data_string);

    if ($checksum !== $expected_checksum) {
        error_log("SePay IPN failed: Invalid checksum for order_code {$order_code}.");
        send_json(['status' => 0, 'msg' => 'Invalid checksum']);
        return;
    }

    if ($status === 'SUCCESS') {
        $result = upgrade_user_from_order($conn, $order_code, $trans_id);
        if ($result) {
            send_json(['status' => 1, 'msg' => 'Success']);
        } else {
            error_log("SePay IPN failed: Could not process order {$order_code}.");
            send_json(['status' => 0, 'msg' => 'Failed to process order']);
        }
    } else {
        $stmt = $conn->prepare("UPDATE sepay_transactions SET status = 'failed', sepay_trans_id = ? WHERE order_code = ? AND status = 'pending'");
        $stmt->bind_param("ss", $trans_id, $order_code);
        $stmt->execute();
        send_json(['status' => 1, 'msg' => 'Success']);
    }
}

function upgrade_user_from_order($conn, $order_code, $sepay_trans_id) {
    $conn->begin_transaction();
    try {
        $stmt = $conn->prepare("SELECT user_id FROM sepay_transactions WHERE order_code = ? AND status = 'pending' FOR UPDATE");
        $stmt->bind_param("s", $order_code);
        $stmt->execute();
        $transaction = $stmt->get_result()->fetch_assoc();
        
        if (!$transaction) {
            $conn->rollback();
            return true;
        }

        $user_id = $transaction['user_id'];
        
        $update_trans_stmt = $conn->prepare("UPDATE sepay_transactions SET status = 'success', sepay_trans_id = ? WHERE order_code = ?");
        $update_trans_stmt->bind_param("ss", $sepay_trans_id, $order_code);
        $update_trans_stmt->execute();

        $update_user_stmt = $conn->prepare("UPDATE users SET is_pro = 1 WHERE uid = ?");
        $update_user_stmt->bind_param("s", $user_id);
        $update_user_stmt->execute();

        $conn->commit();
        return true;
    } catch (Exception $e) {
        $conn->rollback();
        error_log("SePay upgrade_user_from_order failed: " . $e->getMessage());
        return false;
    }
}
?>