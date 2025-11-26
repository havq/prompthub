<?php
/**
 * Loại bỏ tất cả các tag HTML, bao gồm cả nội dung trong các tag <script> và <style>.
 *
 * Tương tự như wp_strip_all_tags nhưng không sử dụng các hàm của WordPress.
 *
 * @param mixed $text Văn bản đầu vào. Nên là string.
 * @param bool $remove_breaks Nếu TRUE, sẽ thay thế các ngắt dòng, tab,
 * và các khoảng trắng thừa bằng một khoảng trắng đơn.
 * @return string Văn bản đã được làm sạch.
 */
function strip_all_tags_pure( $text, $remove_breaks = false ) {
    if ( is_null( $text ) ) { return ''; }
    if ( ! is_scalar( $text ) ) { return ''; }
    $text = (string) $text;
    $text = preg_replace( '@<(script|style)[^>]*?>.*?</\\1>@si', '', $text );
    $text = strip_tags( $text );
    if ( $remove_breaks ) {
        $text = preg_replace( '/[\r\n\t ]+/', ' ', $text );
    }
    return trim( $text );
}

function clear_settings_cache($redis) {
    if (!$redis) return;
    $redis->del(['settings:public', 'settings:admin']);
}

function handle_settings($conn, $method, $get_params, $post_data, $is_admin_request) {
    global $redis;
    if (!$conn) { send_error('Database connection is not available.', 500); return; }
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

    switch ($method) {
        case 'GET': get_app_settings($conn, $is_admin_request); break;
        case 'PUT': 
            if (!$is_admin_request) {
                send_error('Forbidden: Only administrators can update settings.', 403);
                return;
            }
            clear_settings_cache($redis);
            update_app_settings($conn, $post_data); 
            break;
        default: send_error('Method not allowed for settings resource.', 405); break;
    }
}

function get_app_settings($conn, $is_admin_request) {
    global $current_user_uid, $redis;
    $cacheKey = $is_admin_request ? 'settings:admin' : 'settings:public';
    if ($redis) {
        $cachedData = $redis->get($cacheKey);
        if ($cachedData) {
            header('X-Cache-Status: HIT');
            header("Content-Type: application/json; charset=UTF-8");
            echo $cachedData;
            return;
        }
    }
    header('X-Cache-Status: MISS');

    try {
        $result = $conn->query("SELECT setting_key, setting_value FROM settings");
        $settings_from_db = [];
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $settings_from_db[$row['setting_key']] = $row['setting_value'];
            }
        }
        
        if (empty($settings_from_db) && file_exists('../database/settings.json')) {
            $settings_from_json = json_decode(file_get_contents('../database/settings.json'), true);
            if (is_array($settings_from_json)) {
                $stmt = $conn->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
                foreach ($settings_from_json as $key => $value) {
                    $value_to_store = is_array($value) || is_object($value) ? json_encode($value) : $value;
                    if ($value_to_store !== null) {
                        $stmt->bind_param("ss", $key, $value_to_store);
                        $stmt->execute();
                    }
                }
                $stmt->close();
                return get_app_settings($conn, $is_admin_request);
            }
        }

        $final_settings = [];
        $json_keys = [
            'footerSocialLinks', 'footerLinks', 'navigationMenu', 'bottomTabMenu', 'customBadgeIcons',
            'adSettings', 'reelsAdSettings', 'reelsBannerAdSettings', 'overlayAdSettings',
            'topBannerAdSettings', 'bottomBannerAdSettings', 'sidebarTopAdSettings',
            'sidebarBottomAdSettings', 'promptDetailAdSettings', 'promptCardSettings',
            'permalinkSettings',
            'cookieConsentSettings',
            'languageSettings',
            'recaptchaSettings',
            'imgbbApiKeys', 'cloudinaryConfigs', 'tumblrConfigs', 'r2Configs', 'sepayConfig', 'paypalConfig',
            'imageUploadMethod', 'userImageUploadMethod', 'proImageUploadMethod',
            'videoUploadMethod', 'userVideoUploadMethod', 'proVideoUploadMethod',
            'notificationBarSettings',
            'watermarkSettings',
            'homeLayout',
            'rewardPackages',
            'gamificationSettings',
            'smtpConfig'
        ];
        
        foreach ($settings_from_db as $key => $value) {
            // SECURITY FIX: Never expose backend cache tokens (like PayPal access tokens) to the frontend
            if (strpos($key, 'paypal_access_token_') === 0) continue;
            
            if ($value === null) continue;

            $decoded_value = json_decode($value, true);
            if (in_array($key, $json_keys) && json_last_error() === JSON_ERROR_NONE) {
                $final_settings[$key] = $decoded_value;
            } elseif (is_numeric($value) && strpos($value, '.') !== false) { $final_settings[$key] = (float)$value; } 
            elseif (is_numeric($value)) { $final_settings[$key] = (int)$value; } 
            elseif ($value === 'true') { $final_settings[$key] = true; } 
            elseif ($value === 'false') { $final_settings[$key] = false; } 
            else { $final_settings[$key] = $value; }
        }
        
        if (!$is_admin_request) {
            unset($final_settings['adminPassword']);
            unset($final_settings['externalApiUrl']);
            unset($final_settings['smtpConfig']);
            unset($final_settings['tumblrConfigs']);
            unset($final_settings['r2Configs']);
            unset($final_settings['cloudinaryConfigs']);
            
            if (isset($final_settings['imgbbApiKeys'])) {
                $final_settings['imgbbApiKeys'] = array_map(function($item) { unset($item['key']); return $item; }, $final_settings['imgbbApiKeys']);
            }
            if (isset($final_settings['sepayConfig']) && is_array($final_settings['sepayConfig'])) {
                unset($final_settings['sepayConfig']['secretKey']);
            }
            if (isset($final_settings['paypalConfig']) && is_array($final_settings['paypalConfig'])) {
                unset($final_settings['paypalConfig']['clientSecret']);
            }
            if (isset($final_settings['recaptchaSettings']) && is_array($final_settings['recaptchaSettings'])) {
                unset($final_settings['recaptchaSettings']['v2SecretKey']);
                unset($final_settings['recaptchaSettings']['v3SecretKey']);
            }
        }
        
        $jsonResponse = json_encode($final_settings, JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);
        if ($redis) {
            $redis->set($cacheKey, $jsonResponse, ['ex' => 3600]);
        }
        echo $jsonResponse;

    } catch (Exception $e) {
        send_error('An error occurred while fetching settings: ' . $e->getMessage(), 500);
    }
}

function update_app_settings($conn, $new_settings) {
    if (empty($new_settings)) { send_error('No settings data provided.', 400); return; }
    try {
        $conn->begin_transaction();
        $stmt = $conn->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
        
        // Sanitize specific text fields before saving
        if (isset($new_settings['appIntroduction']) && is_string($new_settings['appIntroduction'])) {
            $new_settings['appIntroduction'] = strip_all_tags_pure($new_settings['appIntroduction']);
        }
        if (isset($new_settings['footerCopyrightText']) && is_string($new_settings['footerCopyrightText'])) {
            $new_settings['footerCopyrightText'] = strip_all_tags_pure($new_settings['footerCopyrightText']);
        }
        // NOTE: footerDevelopedByText intentionally allows HTML, so it is NOT sanitized with strip_all_tags_pure.

        // Define keys that MUST be treated as JSON objects/arrays, even if they arrive as strings
        $force_json_decode_keys = [
            'tumblrConfigs', 'r2Configs', 'imgbbApiKeys', 'cloudinaryConfigs', 
            'sepayConfig', 'paypalConfig', 'smtpConfig', 'recaptchaSettings',
            'notificationBarSettings', 'watermarkSettings', 'homeLayout',
            'rewardPackages', 'gamificationSettings', 'footerSocialLinks',
            'footerLinks', 'navigationMenu', 'bottomTabMenu', 'adSettings',
            'reelsAdSettings', 'reelsBannerAdSettings', 'overlayAdSettings',
            'topBannerAdSettings', 'bottomBannerAdSettings', 'sidebarTopAdSettings',
            'sidebarBottomAdSettings', 'promptDetailAdSettings', 'customBadgeIcons',
            'permalinkSettings', 'cookieConsentSettings', 'languageSettings', 'promptCardSettings'
        ];

        foreach ($new_settings as $key => $value) {
            // Critical fix: If the value for a complex setting comes in as a string (JSON), decode it first.
            // This prevents double-encoding or saving string literals instead of JSON structures.
            if (in_array($key, $force_json_decode_keys) && is_string($value)) {
                $decoded = json_decode($value, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $value = $decoded;
                }
            }

            $value_to_store = is_array($value) || is_object($value) ? json_encode($value) : ($value === false ? 'false' : ($value === true ? 'true' : $value));
            
            if ($value_to_store !== null) {
                $stmt->bind_param("ss", $key, $value_to_store);
                $stmt->execute();
            }
        }
        $stmt->close();
        $conn->commit();
        send_json(['status' => 'ok', 'message' => 'Settings updated.']);
    } catch (Exception $e) {
        if ($conn->in_transaction) $conn->rollback();
        send_error('An error occurred while updating settings: ' . $e->getMessage(), 500);
    }
}
?>