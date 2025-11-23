<?php
// api/auth.php

function create_jwt($uid, $email, $role, $is_admin) {
    $secret = JWT_SECRET_KEY; // Defined in api.php
    $issuedAt = time();
    $expirationTime = $issuedAt + (60 * 60 * 24 * 7); // 7 days
    $payload = array(
        'iss' => 'prompthub.today',
        'iat' => $issuedAt,
        'exp' => $expirationTime,
        'uid' => $uid,
        'email' => $email,
        'role' => $role,
        'is_admin' => $is_admin
    );

    // Simple JWT encoding implementation (HS256)
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($payload)));
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret, true);
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

function handle_auth($conn, $method, $post_data) {
    $action = $_GET['action'] ?? '';

    // Allow GET only for verify action
    if ($action === 'verify') {
         if ($method !== 'GET' && $method !== 'POST') {
             send_error('Method not allowed', 405);
         }
    } else {
         if ($method !== 'POST') {
            send_error('Method not allowed', 405);
        }
    }

    if ($action === 'login') {
        $identifier = $post_data['identifier'] ?? '';
        $password = $post_data['password'] ?? '';

        if (empty($identifier) || empty($password)) {
            send_error('Username/Email and password are required.', 400);
        }

        // Find user by email or username
        $stmt = $conn->prepare("SELECT * FROM users WHERE email = ? OR username = ?");
        if (!$stmt) {
            send_error('Database error: ' . $conn->error, 500);
        }
        $stmt->bind_param("ss", $identifier, $identifier);
        $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$user) {
            send_error('Invalid credentials.', 401);
        }

        // Verify password
        if (!password_verify($password, $user['password_hash'] ?? '')) {
            send_error('Invalid credentials.', 401);
        }

        $isAdmin = ($user['role'] === 'Admin');
        $token = create_jwt($user['uid'], $user['email'], $user['role'], $isAdmin);

        // Clean sensitive data
        unset($user['password_hash']);
        unset($user['reset_token']);
        unset($user['reset_token_expiry']);
        // Email is required for the frontend profile state
        $user['badges'] = json_decode($user['badges'] ?: '[]');
        $user['socialLinks'] = json_decode($user['socialLinks'] ?: '[]');

        send_json(['token' => $token, 'user' => $user]);

    } elseif ($action === 'forgot_password') {
        // Load mail function
        if (file_exists('api/mail.php')) {
            require_once 'api/mail.php';
        } elseif (file_exists('mail.php')) {
            require_once 'mail.php';
        } else {
            send_error('Mail service configuration missing.', 500);
        }

        $email = $post_data['email'] ?? '';
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            send_error('Invalid email format.', 400);
        }

        // Check if user exists
        $stmt = $conn->prepare("SELECT uid, username FROM users WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if ($user) {
            // Generate secure token
            $token = bin2hex(random_bytes(32));
            // Token valid for 1 hour
            $expiry = date('Y-m-d H:i:s', time() + 3600);

            // Save token to DB
            // Ensure `reset_token` and `reset_token_expiry` columns exist in `users` table
            $upd = $conn->prepare("UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE uid = ?");
            $upd->bind_param("sss", $token, $expiry, $user['uid']);
            
            if ($upd->execute()) {
                // Get App Settings (Url and RouterMode)
                $result = $conn->query("SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('appUrl', 'routerMode')");
                $settings = [];
                while ($row = $result->fetch_assoc()) {
                    $settings[$row['setting_key']] = $row['setting_value'];
                }

                $appUrl = !empty($settings['appUrl']) ? rtrim($settings['appUrl'], '/') : 'https://prompthub.today';
                $routerMode = $settings['routerMode'] ?? 'browser';

                // Construct Reset Link based on Router Mode
                if ($routerMode === 'hash') {
                    $resetLink = "$appUrl/#/reset-password?token=$token&uid=" . $user['uid'];
                } else {
                    $resetLink = "$appUrl/reset-password?token=$token&uid=" . $user['uid'];
                }
                
                $subject = "Reset Password Request - Prompthub";
                $body = "
                    <h3>Hello {$user['username']},</h3>
                    <p>We received a request to reset your password for your Prompthub account.</p>
                    <p>Click the link below to set a new password:</p>
                    <p><a href='$resetLink' style='background:#4f46e5;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;'>Reset Password</a></p>
                    <p><small>Or copy this link: $resetLink</small></p>
                    <p>This link is valid for 1 hour. If you didn't ask for this, you can safely ignore this email.</p>
                ";
                
                if (send_mail_custom($email, $subject, $body)) {
                    send_json(['status' => 'success', 'message' => 'Password reset email sent.']);
                } else {
                    send_error('Failed to send email. Please try again later.', 500);
                }
            } else {
                send_error('Database error while generating token.', 500);
            }
        } else {
            // Return success even if user not found to prevent enumeration
            send_json(['status' => 'success', 'message' => 'If an account exists, an email has been sent.']);
        }

    } elseif ($action === 'reset_password') {
        $uid = $post_data['uid'] ?? '';
        $token = $post_data['token'] ?? '';
        $newPassword = $post_data['newPassword'] ?? '';

        if (empty($uid) || empty($token) || empty($newPassword)) {
            send_error('Missing required fields.', 400);
        }

        if (strlen($newPassword) < 6) {
            send_error('Password must be at least 6 characters.', 400);
        }

        // Verify token
        $stmt = $conn->prepare("SELECT reset_token, reset_token_expiry FROM users WHERE uid = ?");
        $stmt->bind_param("s", $uid);
        $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$user || $user['reset_token'] !== $token) {
            send_error('Invalid or expired token.', 400);
        }

        if (strtotime($user['reset_token_expiry']) < time()) {
            send_error('Token has expired. Please request a new one.', 400);
        }

        // Update password and clear token
        $password_hash = password_hash($newPassword, PASSWORD_BCRYPT);
        $upd = $conn->prepare("UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE uid = ?");
        $upd->bind_param("ss", $password_hash, $uid);

        if ($upd->execute()) {
            send_json(['status' => 'success', 'message' => 'Password has been reset successfully.']);
        } else {
            send_error('Failed to update password.', 500);
        }

    } elseif ($action === 'google') {
        $access_token = $post_data['accessToken'] ?? '';
        if (!$access_token) {
            send_error('Access token required.', 400);
        }

        // Verify with Google
        $google_user_info = @file_get_contents("https://www.googleapis.com/oauth2/v3/userinfo?access_token=$access_token");
        
        if (!$google_user_info) {
            send_error('Invalid Google Token.', 401);
        }
        
        $g_user = json_decode($google_user_info, true);
        $email = $g_user['email'];
        $google_sub = $g_user['sub']; // Unique Google ID
        $picture = $g_user['picture'];
        $name = $g_user['name'];

        // Check if user exists
        $stmt = $conn->prepare("SELECT * FROM users WHERE email = ?");
        if (!$stmt) { send_error('Database error: ' . $conn->error, 500); }
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        $uid = '';
        $role = 'User';

        if ($user) {
            $uid = $user['uid'];
            $role = $user['role'];
            // Update Google ID if missing (linking account)
            if (empty($user['google_id'])) {
                $conn->query("UPDATE users SET google_id = '$google_sub' WHERE uid = '$uid'");
            }
        } else {
            // Create new user
            $uid = 'user_' . bin2hex(random_bytes(10));
            
            // Check if first user (Make Admin) - Optional logic
            $check_admin = $conn->query("SELECT COUNT(*) as count FROM users");
            $is_first = $check_admin && $check_admin->fetch_assoc()['count'] == 0;
            if ($is_first) {
                $role = 'Admin';
            }

            // Generate unique username
            $base_username = strtolower(preg_replace("/[^a-zA-Z0-9]/", "", explode('@', $email)[0]));
            $username = $base_username;
            $i = 1;
            while(true) {
                $check = $conn->query("SELECT 1 FROM users WHERE username = '$username'");
                if ($check->num_rows == 0) break;
                $username = $base_username . $i++;
            }

            // Ensure database has google_id and points columns
            $stmt = $conn->prepare("INSERT INTO users (uid, username, email, role, photoURL, google_id, points) VALUES (?, ?, ?, ?, ?, ?, 0)");
            
            if (!$stmt) {
                // Graceful check for missing columns
                send_error('Database prepare failed. Check schema for google_id column. Error: ' . $conn->error, 500);
            }
            
            $stmt->bind_param("ssssss", $uid, $username, $email, $role, $picture, $google_sub);
            $stmt->execute();
            
            // Fetch newly created user
            $stmt = $conn->prepare("SELECT * FROM users WHERE uid = ?");
            $stmt->bind_param("s", $uid);
            $stmt->execute();
            $user = $stmt->get_result()->fetch_assoc();
        }

        $isAdmin = ($role === 'Admin');
        $token = create_jwt($uid, $email, $role, $isAdmin);

        unset($user['password_hash']);
        unset($user['reset_token']);
        $user['badges'] = json_decode($user['badges'] ?: '[]');
        $user['socialLinks'] = json_decode($user['socialLinks'] ?: '[]');
        
        send_json(['token' => $token, 'user' => $user]);

    } elseif ($action === 'register') {
        $username = $post_data['username'] ?? '';
        $email = $post_data['email'] ?? '';
        $password = $post_data['password'] ?? '';

        if (empty($username) || empty($email) || empty($password)) {
            send_error('All fields are required.', 400);
        }

        // Check existing
        $stmt = $conn->prepare("SELECT 1 FROM users WHERE email = ? OR username = ?");
        if (!$stmt) { send_error('Database prepare error: ' . $conn->error, 500); }
        $stmt->bind_param("ss", $email, $username);
        $stmt->execute();
        if ($stmt->get_result()->num_rows > 0) {
            send_error('Username or Email already exists.', 400);
        }
        $stmt->close();

        $uid = 'user_' . bin2hex(random_bytes(10));
        $password_hash = password_hash($password, PASSWORD_BCRYPT);
        $role = 'User';
        
        // Auto Admin if email matches config
        if ($email === 'prompthub.today@gmail.com') $role = 'Admin';

        $photoURL = "https://api.dicebear.com/8.x/initials/svg?size=120&seed=" . urlencode($username);

        $stmt = $conn->prepare("INSERT INTO users (uid, username, email, password_hash, role, photoURL, points) VALUES (?, ?, ?, ?, ?, ?, 0)");
        if (!$stmt) { 
            error_log("Registration Prepare Error: " . $conn->error);
            // If this fails, it's likely because 'password_hash' column is missing
            send_error('Database error: `password_hash` column missing in `users` table. Please run migration SQL.', 500); 
        }

        $stmt->bind_param("ssssss", $uid, $username, $email, $password_hash, $role, $photoURL);
        
        if ($stmt->execute()) {
             $token = create_jwt($uid, $email, $role, $role === 'Admin');
             
             $user = [
                 'uid' => $uid,
                 'username' => $username,
                 'email' => $email,
                 'role' => $role,
                 'photoURL' => $photoURL,
                 'isPro' => false,
                 'points' => 0
             ];
             
             send_json(['token' => $token, 'user' => $user]);
        } else {
            error_log("Registration Execute Error: " . $stmt->error);
            send_error('Registration failed: ' . $stmt->error, 500);
        }
    } elseif ($action === 'verify') {
        // Verify token logic is handled by middleware in api.php mostly, 
        // but this endpoint can return refreshed user data
        global $current_user_uid;
        if (!$current_user_uid) send_error('Invalid token', 401);
        
        $stmt = $conn->prepare("SELECT * FROM users WHERE uid = ?");
        if (!$stmt) { send_error('Database error.', 500); }
        $stmt->bind_param("s", $current_user_uid);
        $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc();
        
        if (!$user) send_error('User not found', 404);
        
        unset($user['password_hash']);
        unset($user['reset_token']);
        unset($user['reset_token_expiry']);
        $user['badges'] = json_decode($user['badges'] ?: '[]');
        $user['socialLinks'] = json_decode($user['socialLinks'] ?: '[]');
        $user['isPro'] = (bool)($user['is_pro'] ?? false);
        unset($user['is_pro']);
        
        send_json(['user' => $user]);
    }
}
?>