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

function add_points_to_user($conn, $userId, $points) {
    if (!$userId || $points <= 0) return false;
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

function clear_collections_cache($redis, $userId) {
    if (!$redis || !$userId) return;
    $redis->del('collections:user:' . $userId);
    $redis->del('collections:mappings');
}

function handle_collections($conn, $method, $id, $get_params, $post_data) {
    global $current_user_uid, $redis;
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

    try {
        if (isset($get_params['action']) && $get_params['action'] == 'mappings') {
            if ($method !== 'GET') { send_error('Method not allowed for this action', 405); return; }
            $cacheKey = 'collections:mappings';
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

            $result = $conn->query("SELECT promptIds FROM collections WHERE promptIds IS NOT NULL AND promptIds != '{}'");
            $prompt_counts = [];
            while ($row = $result->fetch_assoc()) {
                $prompt_ids_map = json_decode($row['promptIds'], true);
                if (is_array($prompt_ids_map)) {
                    foreach (array_keys($prompt_ids_map) as $prompt_id) {
                        $prompt_counts[$prompt_id] = ($prompt_counts[$prompt_id] ?? 0) + 1;
                    }
                }
            }
            $jsonResponse = json_encode($prompt_counts, JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);
            if ($redis) {
                $redis->set($cacheKey, $jsonResponse, ['ex' => 300]);
            }
            echo $jsonResponse;
            return;
        }

        $userId = $get_params['userId'] ?? $current_user_uid;
        if (!$userId) send_error('User ID is required', 400);

        switch ($method) {
            case 'GET':
                $cacheKey = 'collections:user:' . $userId;
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

                $stmt = $conn->prepare("SELECT * FROM collections WHERE userId = ? ORDER BY name ASC");
                $stmt->bind_param("s", $userId);
                $stmt->execute();
                $result = $stmt->get_result();
                $collections = [];
                while ($row = $result->fetch_assoc()) {
                    $row['id'] = (string)$row['id'];
                    $row['promptIds'] = json_decode($row['promptIds'] ?: '{}', true);
                    $collections[] = $row;
                }
                
                $jsonResponse = json_encode($collections, JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);
                if ($redis) {
                    $redis->set($cacheKey, $jsonResponse, ['ex' => 300]);
                }
                echo $jsonResponse;
                break;
            case 'POST':
                clear_collections_cache($redis, $userId);
                $data = $post_data;
                if (isset($data['action'])) { // Toggle prompt
                    if (!$id) send_error('Collection ID required', 400);
                    $stmt = $conn->prepare("SELECT name, promptIds FROM collections WHERE id = ? AND userId = ?");
                    $stmt->bind_param("is", $id, $userId);
                    $stmt->execute();
                    $collection = $stmt->get_result()->fetch_assoc();
                    
                    if ($collection) {
                        $promptIds = json_decode($collection['promptIds'] ?: '{}', true);
                        if ($data['action'] === 'add' && !isset($promptIds[$data['promptId']])) {
                            $promptIds[$data['promptId']] = true;
                            
                            $prompt_stmt = $conn->prepare("SELECT authorId, text FROM prompts WHERE id = ?");
                            $prompt_stmt->bind_param("s", $data['promptId']);
                            $prompt_stmt->execute();
                            $prompt_details = $prompt_stmt->get_result()->fetch_assoc();
                            if ($prompt_details && !empty($prompt_details['authorId']) && $prompt_details['authorId'] !== $userId) {
                                $settings_res = $conn->query("SELECT setting_value FROM settings WHERE setting_key = 'gamificationSettings'");
                                $gamification_settings = json_decode($settings_res->fetch_assoc()['setting_value'] ?? '{}', true);
                                $points_collected = $gamification_settings['promptCollected'] ?? 2;
                                add_points_to_user($conn, $prompt_details['authorId'], $points_collected);

                                // Create notification
                                $actor_stmt = $conn->prepare("SELECT username, photoURL FROM users WHERE uid = ?");
                                $actor_stmt->bind_param("s", $userId);
                                $actor_stmt->execute();
                                $actor = $actor_stmt->get_result()->fetch_assoc();
                                $actor_stmt->close();

                                $notification_stmt = $conn->prepare(
                                    "INSERT INTO notifications (recipientId, actorId, actorName, actorPhotoURL, type, promptId, promptText, collectionName, is_read) VALUES (?, ?, ?, ?, 'collection', ?, ?, ?, 0)"
                                );
                                $prompt_text_snippet = mb_substr($prompt_details['text'], 0, 50);
                                $actorPhotoURL = $actor['photoURL'] ?? null;
                                $collectionName = $collection['name'] ?? 'a collection';
                                $notification_stmt->bind_param(
                                    "ssssiss",
                                    $prompt_details['authorId'],
                                    $userId,
                                    $actor['username'],
                                    $actorPhotoURL,
                                    $data['promptId'],
                                    $prompt_text_snippet,
                                    $collectionName
                                );
                                $notification_stmt->execute();
                                $notification_stmt->close();
                            }
                        } else {
                            unset($promptIds[$data['promptId']]);
                        }
                        $update_stmt = $conn->prepare("UPDATE collections SET promptIds = ? WHERE id = ?");
                        $jsonPromptIds = json_encode($promptIds);
                        $update_stmt->bind_param("si", $jsonPromptIds, $id);
                        $update_stmt->execute();
                        send_json(['status' => 'ok']);
                    } else {
                        send_error('Collection not found or permission denied', 404);
                    }
                } else { // Create collection
                    $sanitized_name = strip_all_tags_pure($data['name']);
                    $stmt = $conn->prepare("INSERT INTO collections (name, userId) VALUES (?, ?)");
                    $stmt->bind_param("ss", $sanitized_name, $userId);
                    $stmt->execute();
                    $newId = $stmt->insert_id;
                    send_json(['id' => (string)$newId, 'name' => $sanitized_name, 'userId' => $userId, 'promptIds' => new stdClass()]);
                }
                break;
            case 'PUT':
                clear_collections_cache($redis, $userId);
                if (!$id) send_error('Missing ID for PUT request', 400);
                $data = $post_data;
                $sanitized_name = strip_all_tags_pure($data['name']);
                $stmt = $conn->prepare("UPDATE collections SET name = ? WHERE id = ? AND userId = ?");
                $stmt->bind_param("sis", $sanitized_name, $id, $userId);
                $stmt->execute();
                send_json(['id' => (string)$id, 'name' => $sanitized_name]);
                break;
            case 'DELETE':
                clear_collections_cache($redis, $userId);
                if (!$id) send_error('Missing ID for DELETE request', 400);
                $stmt = $conn->prepare("DELETE FROM collections WHERE id = ? AND userId = ?");
                $stmt->bind_param("is", $id, $userId);
                $stmt->execute();
                send_json(['id' => (string)$id]);
                break;
            default:
                send_error('Method not allowed', 405);
                break;
        }
    } catch (Exception $e) {
        send_error("Database error in collections handler: " . $e->getMessage(), 500);
    }
}
?>