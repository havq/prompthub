
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

    if (isset($get_params['action']) && $get_params['action'] === 'connect_blogger') {
        if (!$is_admin_request) {
             send_error('Forbidden: Only administrators can connect services.', 403); return;
        }
        handle_connect_blogger($conn, $post_data);
        return;
    }

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
        case 'POST':
            // Fallback if action logic above missed, though action check usually prioritized
             if (isset($get_params['action']) && $get_params['action'] === 'connect_blogger') {
                 handle_connect_blogger($conn, $post_data);
             } else {
                 send_error('Method not allowed for settings resource.', 405);
             }
             break;
        default: send_error('Method not allowed for settings resource.', 405); break;
    }
}

function handle_connect_blogger($conn, $data) {
    $code = $data['code'] ?? null;
    if (!$code) {
        send_error('Authorization code is missing.', 400);
        return;
    }

    // 1. Retrieve Client ID and Secret from DB
    $stmt = $conn->prepare("SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('googleClientId', 'googleClientSecret')");
    $stmt->execute();
    $result = $stmt->get_result();
    $creds = [];
    while($row = $result->fetch_assoc()) {
        $creds[$row['setting_key']] = $row['setting_value'];
    }
    
    if (empty($creds['googleClientId']) || empty($creds['googleClientSecret'])) {
        send_error('Google Client ID and Secret must be configured in settings first.', 400);
        return;
    }

    // 2. Exchange Code for Tokens
    $token_url = 'https://oauth2.googleapis.com/token';
    $params = [
        'code' => $code,
        'client_id' => $creds['googleClientId'],
        'client_secret' => $creds['googleClientSecret'],
        'redirect_uri' => 'postmessage', // Crucial for pop-up flow
        'grant_type' => 'authorization_code'
    ];

    $ch = curl_init($token_url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $token_data = json_decode($response, true);

    if ($httpCode !== 200 || !isset($token_data['access_token'])) {
        error_log("Google Token Exchange Failed: " . $response);
        send_error('Failed to exchange code for tokens. Check server logs.', 500);
        return;
    }

    // 3. Save Tokens to DB
    $access_token = $token_data['access_token'];
    $refresh_token = $token_data['refresh_token'] ?? null; // Might not be returned if not first time, unless prompt=consent
    $expires_in = $token_data['expires_in'];
    $expiry_time = time() + $expires_in;

    // We store these as individual settings
    $settings_to_save = [
        'bloggerAccessToken' => $access_token,
        'bloggerTokenExpiry' => $expiry_time
    ];
    if ($refresh_token) {
        $settings_to_save['bloggerRefreshToken'] = $refresh_token;
    }

    $stmt = $conn->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
    foreach ($settings_to_save as $key => $val) {
        $stmt->bind_param("ss", $key, $val);
        $stmt->execute();
    }
    $stmt->close();

    send_json(['status' => 'success', 'message' => 'Blogger connected successfully.']);
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
            // SECURITY FIX: Never expose backend cache tokens (like PayPal/Blogger access tokens) to the frontend
            if (strpos($key, 'paypal_access_token_') === 0) continue;
            if (strpos($key, 'blogger') === 0) continue; // Hide Blogger tokens
            if ($key === 'googleClientSecret') continue; // Hide Google Client Secret
            
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
            unset($final_settings['googleClientId']); // Client ID is public but maybe hide if not needed
            
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
