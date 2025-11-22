<?php
function handle_rewards($conn, $method, $get_params, $post_data) {
    global $current_user_uid, $redis;
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

    // Authentication check
    if (!$current_user_uid) {
        send_error('Authentication required.', 401);
        return;
    }

    try {
        if ($method === 'POST' && isset($post_data['action']) && $post_data['action'] === 'redeem_pro') {
            $packageId = $post_data['packageId'] ?? null;

            if (!$packageId) {
                send_error('Invalid package ID.', 400);
                return;
            }
            
            // 1. Fetch configured packages from settings
            $result = $conn->query("SELECT setting_value FROM settings WHERE setting_key = 'rewardPackages'");
            $packages_json = $result ? $result->fetch_assoc()['setting_value'] : null;
            
            $configured_packages = [];
            if ($packages_json) {
                $configured_packages = json_decode($packages_json, true);
            }

            // Fallback defaults if setting not found or invalid
            if (empty($configured_packages) || !is_array($configured_packages)) {
                $configured_packages = [
                    ['id' => 'pro_3_days', 'points' => 500, 'days' => 3, 'enabled' => true],
                    ['id' => 'pro_7_days', 'points' => 1000, 'days' => 7, 'enabled' => true],
                    ['id' => 'pro_30_days', 'points' => 3000, 'days' => 30, 'enabled' => true],
                ];
            }

            // Find the requested package
            $selected_package = null;
            foreach ($configured_packages as $pkg) {
                if ($pkg['id'] === $packageId && !empty($pkg['enabled'])) {
                    $selected_package = $pkg;
                    break;
                }
            }

            if (!$selected_package) {
                send_error('Package not found or disabled.', 400);
                return;
            }

            $cost = (int)$selected_package['points'];
            $days = (int)$selected_package['days'];

            // Start transaction
            $conn->begin_transaction();

            try {
                // 2. Get user's current points and pro status (Lock row for update)
                $stmt = $conn->prepare("SELECT points, is_pro, pro_expiration_date FROM users WHERE uid = ? FOR UPDATE");
                $stmt->bind_param("s", $current_user_uid);
                $stmt->execute();
                $user = $stmt->get_result()->fetch_assoc();
                $stmt->close();

                if (!$user) {
                    throw new Exception('User not found.', 404);
                }

                if ($user['points'] < $cost) {
                    throw new Exception('Not enough points.', 400);
                }

                // 3. Calculate new expiration date
                $current_expiry_timestamp = $user['pro_expiration_date'] ? strtotime($user['pro_expiration_date']) : 0;
                $now = time();
                
                // If currently Pro and not expired, extend from current expiration.
                // Otherwise, start from now.
                if ($user['is_pro'] && $current_expiry_timestamp > $now) {
                    $base_time = $current_expiry_timestamp;
                } else {
                    $base_time = $now;
                }
                
                $new_expiry_date = date('Y-m-d H:i:s', strtotime("+$days days", $base_time));

                // 4. Deduct points and update Pro status
                $update_stmt = $conn->prepare("UPDATE users SET points = points - ?, is_pro = 1, pro_expiration_date = ? WHERE uid = ?");
                $update_stmt->bind_param("iss", $cost, $new_expiry_date, $current_user_uid);
                $update_stmt->execute();
                $update_stmt->close();

                $conn->commit();

                // Clear Redis cache for the user to ensure fresh data
                // Must use the same key format as in api/users.md
                if (isset($redis) && $redis) {
                    $redis->del('users:uid:' . $current_user_uid);
                }

                // Return success and updated data
                send_json([
                    'success' => true,
                    'newPoints' => $user['points'] - $cost,
                    'newExpiration' => $new_expiry_date,
                    'isPro' => true
                ]);
            } catch (Exception $e) {
                $conn->rollback();
                // Handle specific logic errors with appropriate HTTP codes
                if ($e->getCode() === 404 || $e->getCode() === 400) {
                    send_error($e->getMessage(), $e->getCode());
                }
                throw $e; // Re-throw unexpected errors to outer catch
            }

        } else {
            send_error('Invalid action or method.', 400);
        }
    } catch (Exception $e) {
        error_log("Rewards error: " . $e->getMessage());
        send_error('An error occurred while processing the reward.', 500);
    }
}