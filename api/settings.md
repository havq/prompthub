
<?php
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
            // SECURITY: Only admins can update settings
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
        
        // Fallback to JSON if DB is empty (Initialization logic)
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
        $json_keys = ['firebaseConfig', 'adSettings', 'reelsAdSettings', 'reelsBannerAdSettings', 'navigationMenu', 'bottomTabMenu', 'footerLinks', 'customBadgeIcons', 'cloudinaryUploadPresets', 'overlayAdSettings', 'topBannerAdSettings', 'bottomBannerAdSettings', 'sidebarTopAdSettings', 'sidebarBottomAdSettings', 'promptDetailAdSettings', 'promptCardSettings', 'footerSocialLinks', 'imageUploadMethod', 'userImageUploadMethod', 'proImageUploadMethod', 'videoUploadMethod', 'userVideoUploadMethod', 'proVideoUploadMethod', 'imgbbApiKeys', 'cloudinaryConfigs', 'tumblrConfigs', 'sepayConfig', 'paypalConfig', 'permalinkSettings', 'cookieConsentSettings', 'languageSettings', 'recaptchaSettings', 'notificationBarSettings', 'watermarkSettings', 'homeLayout', 'rewardPackages', 'smtpConfig'];
        
        foreach ($settings_from_db as $key => $value) {
            if ($value === null) continue;
            if (in_array($key, $json_keys)) {
                $decoded_value = json_decode($value, true);
                if (json_last_error() === JSON_ERROR_NONE) $final_settings[$key] = $decoded_value;
            } elseif (is_numeric($value) && strpos($value, '.') !== false) { $final_settings[$key] = (float)$value; } 
            elseif (is_numeric($value)) { $final_settings[$key] = (int)$value; } 
            elseif ($value === 'true') { $final_settings[$key] = true; } 
            elseif ($value === 'false') { $final_settings[$key] = false; } 
            else { $final_settings[$key] = $value; }
        }
        
        // SECURITY: Filter sensitive data for non-admin users
        if (!$is_admin_request) {
            // Do NOT unset firebaseConfig as it is needed for client-side auth
            unset($final_settings['adminPassword']);
            unset($final_settings['externalApiUrl']); // Optionally hide if internal
            unset($final_settings['smtpConfig']); // Hide entirely from public
            
            // NOTE: ImgBB and Cloudinary keys MUST be exposed to the frontend for 
            // client-side uploads to work. Do not unset them here.
            // Only unset Tumblr configs as Tumblr uses a server-side proxy.
            unset($final_settings['tumblrConfigs']);
            
            // For payment configs, remove secret keys but keep public IDs
            if (isset($final_settings['sepayConfig']) && is_array($final_settings['sepayConfig'])) {
                unset($final_settings['sepayConfig']['secretKey']);
            }
            if (isset($final_settings['paypalConfig']) && is_array($final_settings['paypalConfig'])) {
                unset($final_settings['paypalConfig']['clientSecret']);
            }

            // Hide Recaptcha Secret Keys
            if (isset($final_settings['recaptchaSettings']) && is_array($final_settings['recaptchaSettings'])) {
                unset($final_settings['recaptchaSettings']['v2SecretKey']);
                unset($final_settings['recaptchaSettings']['v3SecretKey']);
            }
            
            // Cleanup legacy keys if they exist in DB
            unset($final_settings['imgbbApiKey']);
            unset($final_settings['cloudinaryCloudName']);
            unset($final_settings['cloudinaryUploadPresets']);
            unset($final_settings['tumblrConsumerKey']);
            unset($final_settings['tumblrConsumerSecret']);
            unset($final_settings['tumblrToken']);
            unset($final_settings['tumblrTokenSecret']);
            unset($final_settings['paypal_access_token_live']);
            unset($final_settings['paypal_access_token_sandbox']);
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
        
        foreach ($new_settings as $key => $value) {
            // Sanitize or block certain keys if necessary
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
