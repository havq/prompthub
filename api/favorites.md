<?php
function add_points_to_user($conn, $userId, $points) {
    if (!$userId || $points <= 0) {
        return false;
    }
    try {
        $stmt = $conn->prepare("UPDATE users SET points = IFNULL(points, 0) + ? WHERE uid = ?");
        $stmt->bind_param("is", $points, $userId);
        $stmt->execute();
        $stmt->close();
        return true;
    } catch (Exception $e) {
        error_log("Failed to add points to user $userId: " . $e->getMessage());
        return false;
    }
}

function clear_favorites_cache($redis, $userId) {
    if (!$redis || !$userId) return;
    $redis->del('favorites:user:' . $userId);
}

function handle_favorites($conn, $method, $get_params, $post_data) {
    global $current_user_uid, $redis;
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    require_once 'api/prompts.md';

    // FIX: Consistently use the authenticated user's ID from the secure token for all operations.
    // This resolves inconsistencies between GET (reading) and POST/DELETE (writing) which caused an empty list to be returned.
    $userId = $current_user_uid;

    if (!$userId) {
        if ($method === 'GET') {
            send_json([]); // Guests have no server-side favorites.
            return;
        }
        // For POST/DELETE, a user must be authenticated.
        send_error('Authentication is required to modify favorites.', 401);
        return;
    }

    try {
        switch ($method) {
            case 'GET':
                $cacheKey = 'favorites:user:' . $userId;
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

                $stmt = $conn->prepare("SELECT promptId FROM favorites WHERE userId = ?");
                $stmt->bind_param("s", $userId);
                $stmt->execute();
                $result = $stmt->get_result();
                $favorites = [];
                while ($row = $result->fetch_assoc()) {
                    $favorites[] = (string)$row['promptId'];
                }
                $stmt->close();

                $jsonResponse = json_encode($favorites, JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);
                if ($redis) {
                    $redis->set($cacheKey, $jsonResponse, ['ex' => 300]);
                }
                echo $jsonResponse;
                break;

            case 'POST':
                clear_favorites_cache($redis, $userId);
                clear_prompts_cache($redis);

                $data = $post_data;
                $promptId = (int)($data['promptId'] ?? 0);

                if ($promptId <= 0) {
                    send_error('Invalid promptId provided.', 400);
                    return;
                }
                
                $stmt = $conn->prepare("INSERT IGNORE INTO favorites (userId, promptId) VALUES (?, ?)");
                $stmt->bind_param("si", $userId, $promptId);
                $stmt->execute();
                $was_inserted = $stmt->affected_rows > 0;
                $stmt->close();

                if ($was_inserted) {
                    $prompt_stmt = $conn->prepare("SELECT authorId, text FROM prompts WHERE id = ?");
                    $prompt_stmt->bind_param("i", $promptId);
                    $prompt_stmt->execute();
                    $prompt_details = $prompt_stmt->get_result()->fetch_assoc();
                    $prompt_stmt->close();
                    
                    if ($prompt_details && !empty($prompt_details['authorId']) && $prompt_details['authorId'] !== $userId) {
                        $settings_res = $conn->query("SELECT setting_value FROM settings WHERE setting_key = 'gamificationSettings'");
                        $gamification_settings = json_decode($settings_res->fetch_assoc()['setting_value'] ?? '{}', true);
                        $points_favorited = $gamification_settings['promptFavorited'] ?? 1;
                        add_points_to_user($conn, $prompt_details['authorId'], $points_favorited);

                        // Create notification
                        $actor_stmt = $conn->prepare("SELECT username, photoURL FROM users WHERE uid = ?");
                        $actor_stmt->bind_param("s", $userId);
                        $actor_stmt->execute();
                        $actor = $actor_stmt->get_result()->fetch_assoc();
                        $actor_stmt->close();

                        if ($actor) {
                            $notification_stmt = $conn->prepare(
                                "INSERT INTO notifications (recipientId, actorId, actorName, actorPhotoURL, type, promptId, promptText, is_read) VALUES (?, ?, ?, ?, 'favorite', ?, ?, 0)"
                            );
                            $prompt_text_snippet = mb_substr($prompt_details['text'], 0, 50);
                            $actorPhotoURL = $actor['photoURL'] ?? null;
                            $notification_stmt->bind_param(
                                "ssssis",
                                $prompt_details['authorId'],
                                $userId,
                                $actor['username'],
                                $actorPhotoURL,
                                $promptId,
                                $prompt_text_snippet
                            );
                            $notification_stmt->execute();
                            $notification_stmt->close();
                        }
                    }
                }

                send_json(['status' => 'ok']);
                break;

            case 'DELETE':
                clear_favorites_cache($redis, $userId);
                clear_prompts_cache($redis);
                
                $promptId = (int)($get_params['promptId'] ?? 0);
                if (!$promptId) send_error('Missing or invalid promptId', 400);
                $stmt = $conn->prepare("DELETE FROM favorites WHERE userId = ? AND promptId = ?");
                $stmt->bind_param("si", $userId, $promptId);
                $stmt->execute();
                send_json(['status' => 'ok']);
                break;

            default:
                send_error('Method not allowed', 405);
                break;
        }
    } catch (Exception $e) {
        send_error("Database error in favorites handler: " . $e->getMessage(), 500);
    }
}
?>