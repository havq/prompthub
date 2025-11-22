<?php
function clear_users_cache($redis, $uid = null) {
    if(!$redis) return;
    if ($uid) {
        $redis->del('users:uid:' . $uid);
    }
    // Clear list caches
    $keys = $redis->keys('users:list:*');
    if (!empty($keys)) {
        $redis->del($keys);
    }
    $redis->del('users:top_contributors');
}

function handle_users($conn, $method, $uid, $get_params, $post_data) {
    try {
        global $current_user_uid, $is_admin_request, $redis;
        mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

        switch($method) {
            case 'GET':
                // Determine Cache Key Strategy
                $cacheKey = '';
                if ($uid) {
                    $cacheKey = 'users:uid:' . $uid;
                } elseif (isset($get_params['username'])) {
                    $cacheKey = 'users:username:' . $get_params['username'];
                } elseif (isset($get_params['action']) && $get_params['action'] === 'top_contributors') {
                    $cacheKey = 'users:top_contributors';
                } else {
                     $cacheKey = 'users:list:' . md5(http_build_query($get_params));
                }

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

                $response = null;

                if (isset($get_params['action']) && $get_params['action'] === 'top_contributors') {
                    $stmt = $conn->prepare("
                        SELECT u.*, (SELECT COUNT(*) FROM prompts p WHERE p.authorId = u.uid) as promptCount
                        FROM users u
                        ORDER BY u.points DESC
                        LIMIT 10
                    ");
                    $stmt->execute();
                    $result = $stmt->get_result();
                    $users = [];
                    while ($row = $result->fetch_assoc()) {
                        $row['isPro'] = isset($row['is_pro']) ? (bool)$row['is_pro'] : false;
                        unset($row['is_pro']);
                        if (isset($row['pro_expiration_date'])) {
                            $row['proExpirationDate'] = $row['pro_expiration_date'];
                            unset($row['pro_expiration_date']);
                        }
                        // SECURITY: Filter sensitive info
                        unset($row['email'], $row['notificationSettings'], $row['following']);
                        $row['profileBannerUrl'] = $row['profileBannerUrl'] ?? null;
                        $row['badges'] = json_decode($row['badges']);
                        $row['socialLinks'] = json_decode($row['socialLinks']);
                        $users[] = $row;
                    }
                    $response = $users;
                } else if ($uid) {
                     $stmt = $conn->prepare("SELECT * FROM users WHERE uid = ?");
                     $stmt->bind_param("s", $uid);
                     $stmt->execute();
                     $result = $stmt->get_result();
                     $user = $result->fetch_assoc();
                     if($user) {
                        $is_self = ($current_user_uid === $user['uid']);
                        // SECURITY: Only show email/settings to self or admin
                        if (!$is_admin_request && !$is_self) {
                            unset($user['email'], $user['notificationSettings'], $user['following']); 
                        }
                        $user['isPro'] = isset($user['is_pro']) ? (bool)$user['is_pro'] : false;
                        unset($user['is_pro']);
                        
                        if (isset($user['pro_expiration_date'])) {
                            $user['proExpirationDate'] = $user['pro_expiration_date'];
                            unset($user['pro_expiration_date']);
                        }

                        $user['profileBannerUrl'] = $user['profileBannerUrl'] ?? null;
                        
                        if (isset($user['notificationSettings'])) $user['notificationSettings'] = json_decode($user['notificationSettings'], true);
                        if (isset($user['following'])) $user['following'] = json_decode($user['following'], true);
                        $user['badges'] = json_decode($user['badges']);
                        $user['socialLinks'] = json_decode($user['socialLinks']);
                     }
                     $response = $user;
                } elseif (isset($get_params['username'])) {
                    $stmt = $conn->prepare("SELECT * FROM users WHERE username = ?");
                    $stmt->bind_param("s", $get_params['username']);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    $user = $result->fetch_assoc();
                     if($user) {
                        $is_self = ($current_user_uid === $user['uid']);
                        // SECURITY: Only show email/settings to self or admin
                        if (!$is_admin_request && !$is_self) {
                            unset($user['email'], $user['notificationSettings'], $user['following']);
                        }
                        $user['isPro'] = isset($user['is_pro']) ? (bool)$user['is_pro'] : false;
                        unset($user['is_pro']);
                        
                        if (isset($user['pro_expiration_date'])) {
                            $user['proExpirationDate'] = $user['pro_expiration_date'];
                            unset($user['pro_expiration_date']);
                        }

                        $user['profileBannerUrl'] = $user['profileBannerUrl'] ?? null;
                        
                        if (isset($user['notificationSettings'])) $user['notificationSettings'] = json_decode($user['notificationSettings'], true);
                        if (isset($user['following'])) $user['following'] = json_decode($user['following'], true);
                        $user['badges'] = json_decode($user['badges']);
                        $user['socialLinks'] = json_decode($user['socialLinks']);
                     }
                    $response = $user;
                } else {
                    // List all users
                    if (!$is_admin_request) {
                        // Public view: Only show limited info of users who have public prompts
                        // Use proper escaping for column names
                        $is_private_column_exists = $conn->query("SHOW COLUMNS FROM `prompts` LIKE 'isPrivate'")->num_rows > 0;
                        $where_clause = $is_private_column_exists ? "WHERE p.isPrivate = 0" : "";
                        
                        $sql = "SELECT DISTINCT u.uid, u.username, u.photoURL FROM users u JOIN prompts p ON u.uid = p.authorId {$where_clause} ORDER BY u.username ASC";
                        $result = $conn->query($sql);
                        $users = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
                        $response = $users;
                    } else {
                        // Admin view: Show everything
                        $result = $conn->query("SELECT * FROM users");
                        $users = [];
                        while ($row = $result->fetch_assoc()) {
                            $row['isPro'] = isset($row['is_pro']) ? (bool)$row['is_pro'] : false;
                            unset($row['is_pro']);

                            if (isset($row['pro_expiration_date'])) {
                                $row['proExpirationDate'] = $row['pro_expiration_date'];
                                unset($row['pro_expiration_date']);
                            }

                            $row['profileBannerUrl'] = $row['profileBannerUrl'] ?? null;
                            $row['notificationSettings'] = isset($row['notificationSettings']) ? json_decode($row['notificationSettings'], true) : null;
                            $row['badges'] = json_decode($row['badges']);
                            $row['following'] = json_decode($row['following'], true);
                            $row['socialLinks'] = json_decode($row['socialLinks']);
                            $users[] = $row;
                        }
                        $response = $users;
                    }
                }

                $jsonResponse = json_encode($response, JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);
                if ($redis) {
                    $redis->set($cacheKey, $jsonResponse, ['ex' => 300]);
                }
                echo $jsonResponse;
                break;
            case 'POST':
                clear_users_cache($redis);
                $data = $post_data;
                if (isset($get_params['action'])) {
                    $action = $get_params['action'];
                    if ($action == 'lookup_username') {
                        if (!isset($data['username'])) { send_json(null); return; }
                        // Fetch UID, email, points, isPro status for admin usage
                        $stmt = $conn->prepare("SELECT uid, username, email, photoURL, points, is_pro, pro_expiration_date, role FROM users WHERE username = ?");
                        $stmt->bind_param("s", $data['username']);
                        $stmt->execute();
                        $user = $stmt->get_result()->fetch_assoc();
                        
                        if ($user) {
                            $user['isPro'] = isset($user['is_pro']) ? (bool)$user['is_pro'] : false;
                            unset($user['is_pro']);
                            if (isset($user['pro_expiration_date'])) {
                                $user['proExpirationDate'] = $user['pro_expiration_date'];
                                unset($user['pro_expiration_date']);
                            }
                        }
                        
                        send_json($user);
                        return;
                    }
                    if ($action == 'follow' || $action == 'unfollow') {
                        if (!$current_user_uid) { send_error('Authentication required', 401); return; }
                        if (!isset($data['currentUserId']) || !isset($data['targetUserId'])) { send_error('Missing user IDs', 400); return; }
                        
                        $currentUserId = $data['currentUserId'];
                        $targetUserId = $data['targetUserId'];

                        // SECURITY: Ensure the requester is the one performing the follow action
                        if ($currentUserId !== $current_user_uid) {
                            send_error('Forbidden: You can only follow users on your own behalf.', 403);
                            return;
                        }

                        clear_users_cache($redis, $currentUserId);
                        clear_users_cache($redis, $targetUserId);

                        $conn->begin_transaction();
                        try {
                            $stmt = $conn->prepare("SELECT following FROM users WHERE uid = ? FOR UPDATE");
                            $stmt->bind_param("s", $currentUserId);
                            $stmt->execute();
                            $user = $stmt->get_result()->fetch_assoc();
                            $following = ($user && $user['following']) ? json_decode($user['following'], true) : [];
                            if (!is_array($following)) $following = [];

                            $increment = 0;
                            if ($action == 'follow' && !isset($following[$targetUserId])) {
                                $following[$targetUserId] = true;
                                $increment = 1;
                            } elseif ($action == 'unfollow' && isset($following[$targetUserId])) {
                                unset($following[$targetUserId]);
                                $increment = -1;
                            }

                            if ($increment !== 0) {
                                $stmt_update_following = $conn->prepare("UPDATE users SET following = ? WHERE uid = ?");
                                $jsonFollowing = json_encode($following);
                                $stmt_update_following->bind_param("ss", $jsonFollowing, $currentUserId);
                                $stmt_update_following->execute();

                                $stmt_update_followers = $conn->prepare("UPDATE users SET followerCount = GREATEST(0, IFNULL(followerCount, 0) + ?) WHERE uid = ?");
                                $stmt_update_followers->bind_param("is", $increment, $targetUserId);
                                $stmt_update_followers->execute();
                            }
                            $conn->commit();
                            send_json(['status' => 'success']);
                        } catch (Exception $e) {
                            $conn->rollback();
                            throw $e;
                        }
                        return;
                    }
                }
                
                if (!isset($data['uid'], $data['username'], $data['email'])) { send_error('Missing required fields for user creation', 400); return; }
                
                // SECURITY: Prevent users from creating accounts for others
                if ($data['uid'] !== $current_user_uid && !$is_admin_request) {
                    send_error('Forbidden: You can only create your own profile.', 403);
                    return;
                }

                $stmt = $conn->prepare("INSERT INTO users (uid, username, email, photoURL, role, is_pro) VALUES (?, ?, ?, ?, ?, ?)");
                
                // SECURITY: Enforce default role and pro status for non-admins
                $role = $is_admin_request ? ($data['role'] ?? 'User') : 'User';
                $is_pro = $is_admin_request ? (isset($data['isPro']) && $data['isPro'] ? 1 : 0) : 0;
                $photoURL = $data['photoURL'] ?? null;
                $sanitized_username = htmlspecialchars($data['username'], ENT_QUOTES, 'UTF-8');
                
                $stmt->bind_param("sssssi", $data['uid'], $sanitized_username, $data['email'], $photoURL, $role, $is_pro);
                if ($stmt->execute()) {
                    send_json(['uid' => $data['uid']]);
                } else {
                    send_error('Failed to create user: ' . $stmt->error, 500);
                }
                break;
            case 'PUT':
                if (!$uid) { send_error('User ID is required for update', 400); return; }
                clear_users_cache($redis, $uid);
                $data = $post_data;
                
                // SECURITY: Authorization check already done in api.php router for PUT users, 
                // but reiterating logic: Admin can edit any, User can only edit self.
                
                $fields = [];
                $params = [];
                $types = '';
                if (empty($data)) { send_error('No data provided to update', 400); return; }

                foreach($data as $key => $value) {
                    if ($key == 'uid') continue;
                    // SECURITY: Prevent Privilege Escalation. Only Admins can change role, isPro, points, badges.
                    if (in_array($key, ['role', 'isPro', 'is_pro', 'points', 'badges']) && !$is_admin_request) {
                        continue;
                    }

                    $db_key = ['isPro' => 'is_pro', 'profileBannerUrl' => 'profileBannerUrl', 'notificationSettings' => 'notificationSettings'][$key] ?? $key;
                    
                    if ($value === null || (is_string($value) && strtolower($value) === 'null') || $value === '') {
                        $fields[] = "`$db_key` = NULL";
                    } else {
                        $fields[] = "`$db_key` = ?";
                        $sanitized_value = $value;
                        
                        // Sanitize string inputs
                        if ($key === 'username' || $key === 'bio') {
                            $sanitized_value = htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
                        }

                        // SECURITY: Sanitize Social Links JSON structure
                        if ($key === 'socialLinks' && is_array($value)) {
                            $sanitized_links = array_map(function($link) {
                                return [
                                    'platform' => htmlspecialchars($link['platform'] ?? '', ENT_QUOTES, 'UTF-8'),
                                    'url' => htmlspecialchars($link['url'] ?? '', ENT_QUOTES, 'UTF-8'),
                                    'iconUrl' => isset($link['iconUrl']) ? htmlspecialchars($link['iconUrl'], ENT_QUOTES, 'UTF-8') : null,
                                    'target' => isset($link['target']) && $link['target'] === '_self' ? '_self' : '_blank'
                                ];
                            }, $value);
                            $sanitized_value = $sanitized_links;
                        }

                        if (is_bool($sanitized_value)) { $params[] = (int)$sanitized_value; $types .= 'i'; } 
                        elseif (is_int($sanitized_value)) { $params[] = $sanitized_value; $types .= 'i'; } 
                        elseif (is_array($sanitized_value) || is_object($sanitized_value)) { $params[] = json_encode($sanitized_value); $types .= 's'; } 
                        else { $params[] = $sanitized_value; $types .= 's'; }
                    }
                }
                if (count($fields) > 0) {
                    $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE uid = ?";
                    $stmt = $conn->prepare($sql);
                    if (!$stmt) { send_error('Failed to prepare statement: ' . $conn->error, 500); return; }
                    
                    if(!empty($types)) { 
                        $params[] = $uid; 
                        $types .= 's'; 
                        $stmt->bind_param($types, ...$params); 
                    } else { 
                        $stmt->bind_param('s', $uid); 
                    }
                    
                    if (!$stmt->execute()) { send_error('Failed to execute statement: ' . $stmt->error, 500); return; }
                }
                send_json(['uid' => $uid]);
                break;
            case 'DELETE':
                if (!$is_admin_request) {
                    send_error('Forbidden: Only administrators can delete users.', 403);
                    return;
                }
                clear_users_cache($redis, $uid);
                // Code for delete is handled in api.php switch case but implementing here for completeness if needed
                // Assuming delete logic is called here
                 if (!$uid) send_error('Missing ID for DELETE request', 400);
                $stmt = $conn->prepare("DELETE FROM users WHERE uid=?");
                $stmt->bind_param("s", $uid);
                $stmt->execute();
                send_json(['id' => $uid]);
                break;
            default:
                send_error('Method not allowed', 405);
                break;
        }
    } catch (Exception $e) {
        if ($conn->in_transaction) {
            $conn->rollback();
        }
        send_error("Database error in users handler: " . $e->getMessage(), 500);
    }
}
?>