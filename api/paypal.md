<?php
// api/paypal.php

use GuzzleHttp\Client;

function handle_paypal($conn, $method, $get_params, $post_data) {
    global $current_user_uid;
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

    if ($method !== 'POST') {
        send_error('Method not allowed.', 405);
        return;
    }
    if (!$current_user_uid) {
        send_error('Authentication required.', 401);
        return;
    }

    $action = $get_params['action'] ?? null;
    $config = get_paypal_config($conn);
    if (!$config) {
        send_error('PayPal is not configured or enabled on the server.', 500);
        return;
    }

    if ($action === 'create-order') {
        handle_create_order($conn, $post_data, $current_user_uid, $config);
    } elseif ($action === 'capture-order') {
        handle_capture_order($conn, $post_data, $current_user_uid, $config);
    } else {
        send_error('Invalid action for PayPal resource.', 400);
    }
}

function get_paypal_config($conn) {
    $result = $conn->query("SELECT setting_value FROM settings WHERE setting_key = 'paypalConfig'");
    $config_json = $result ? $result->fetch_assoc()['setting_value'] : null;
    if (!$config_json) return null;

    $config = json_decode($config_json, true);
    if (!is_array($config)) return null;

    if (!empty($config['enabled']) && !empty($config['clientId']) && !empty($config['clientSecret']) && !empty($config['mode'])) {
        return [
            'client_id' => $config['clientId'],
            'client_secret' => $config['clientSecret'],
            'mode' => $config['mode']
        ];
    }
    
    return null;
}

function get_paypal_api_url($config) {
    return $config['mode'] === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
}

function get_paypal_access_token($config, $conn) {
    $cache_key = 'paypal_access_token_' . $config['mode'];
    $stmt = $conn->prepare("SELECT setting_value FROM settings WHERE setting_key = ?");
    $stmt->bind_param("s", $cache_key);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    $cached_token_data = $result ? json_decode($result['setting_value'], true) : null;

    if ($cached_token_data && $cached_token_data['expires_at'] > time()) {
        return $cached_token_data['access_token'];
    }

    $client = new Client();
    $base_url = get_paypal_api_url($config);
    
    try {
        $response = $client->post("$base_url/v1/oauth2/token", [
            'auth' => [$config['client_id'], $config['client_secret']],
            'form_params' => [
                'grant_type' => 'client_credentials'
            ]
        ]);

        $body = json_decode($response->getBody(), true);
        if (isset($body['access_token'])) {
            $token_data = [
                'access_token' => $body['access_token'],
                'expires_at' => time() + $body['expires_in'] - 60 // -60s buffer
            ];
            $stmt_update = $conn->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
            $json_token_data = json_encode($token_data);
            $stmt_update->bind_param("ss", $cache_key, $json_token_data);
            $stmt_update->execute();
            return $token_data['access_token'];
        } else {
            throw new Exception('Access token not found in PayPal response.');
        }
    } catch (Exception $e) {
        error_log("PayPal Auth Error: " . $e->getMessage());
        return null;
    }
}

function handle_create_order($conn, $post_data, $user_id, $config) {
    $access_token = get_paypal_access_token($config, $conn);
    if (!$access_token) {
        send_error('Could not authenticate with PayPal.', 500);
        return;
    }

    $client = new Client();
    $base_url = get_paypal_api_url($config);
    $amount = $post_data['amount'] ?? '5.00';
    $currency = $post_data['currency'] ?? 'USD';

    try {
        $response = $client->post("$base_url/v2/checkout/orders", [
            'headers' => [
                'Authorization' => "Bearer $access_token",
                'Content-Type' => 'application/json'
            ],
            'json' => [
                'intent' => 'CAPTURE',
                'purchase_units' => [[
                    'amount' => [
                        'currency_code' => $currency,
                        'value' => $amount
                    ],
                    'description' => 'Pro Membership Upgrade'
                ]]
            ]
        ]);

        $body = json_decode($response->getBody(), true);

        if (isset($body['id'])) {
            $order_id = $body['id'];
            $stmt = $conn->prepare("INSERT INTO paypal_transactions (user_id, paypal_order_id, amount, currency, status) VALUES (?, ?, ?, ?, 'CREATED')");
            $stmt->bind_param("ssds", $user_id, $order_id, $amount, $currency);
            $stmt->execute();
            send_json(['orderID' => $order_id]);
        } else {
            send_error('Failed to create PayPal order.', 500);
        }
    } catch (Exception $e) {
        send_error('PayPal API error during order creation: ' . $e->getMessage(), 500);
    }
}

function handle_capture_order($conn, $post_data, $user_id, $config) {
    $order_id = $post_data['orderID'] ?? null;
    if (!$order_id) {
        send_error('PayPal Order ID is required.', 400);
        return;
    }

    $conn->begin_transaction();
    try {
        $stmt = $conn->prepare("SELECT * FROM paypal_transactions WHERE paypal_order_id = ? AND user_id = ? AND status = 'CREATED' FOR UPDATE");
        $stmt->bind_param("ss", $order_id, $user_id);
        $stmt->execute();
        $transaction = $stmt->get_result()->fetch_assoc();

        if (!$transaction) {
            $conn->rollback();
            // Check if it was already processed to avoid erroring on a double-click
            $check_stmt = $conn->prepare("SELECT status FROM paypal_transactions WHERE paypal_order_id = ? AND user_id = ?");
            $check_stmt->bind_param("ss", $order_id, $user_id);
            $check_stmt->execute();
            $existing_trans = $check_stmt->get_result()->fetch_assoc();
            if ($existing_trans && $existing_trans['status'] === 'COMPLETED') {
                send_json(['success' => true]);
            } else {
                send_error('Transaction not found, already processed, or invalid.', 404);
            }
            return;
        }

        $access_token = get_paypal_access_token($config, $conn);
        if (!$access_token) {
            throw new Exception("Could not get PayPal access token.");
        }

        $client = new Client();
        $base_url = get_paypal_api_url($config);

        $response = $client->post("$base_url/v2/checkout/orders/$order_id/capture", [
            'headers' => [
                'Authorization' => "Bearer $access_token",
                'Content-Type' => 'application/json'
            ]
        ]);

        $body = json_decode($response->getBody(), true);

        if (isset($body['status']) && $body['status'] === 'COMPLETED') {
            $capture_id = $body['purchase_units'][0]['payments']['captures'][0]['id'];

            // Update transaction status
            $update_trans = $conn->prepare("UPDATE paypal_transactions SET status = 'COMPLETED', paypal_capture_id = ? WHERE id = ?");
            $update_trans->bind_param("si", $capture_id, $transaction['id']);
            $update_trans->execute();

            // Upgrade user
            $update_user = $conn->prepare("UPDATE users SET is_pro = 1 WHERE uid = ?");
            $update_user->bind_param("s", $user_id);
            $update_user->execute();

            $conn->commit();
            send_json(['success' => true]);
        } else {
            throw new Exception('PayPal capture was not successful.');
        }

    } catch (Exception $e) {
        $conn->rollback();
        error_log("PayPal Capture Error: " . $e->getMessage());
        send_error('Failed to capture payment: ' . $e->getMessage(), 500);
    }
}
?>