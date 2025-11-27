<?php
function clear_showcase_cache($redis) {
    if (!$redis) return;
    $keys = $redis->keys('showcase:*');
    if ($keys && count($keys) > 0) {
        $redis->del($keys);
    }
}

function handle_showcase_images($conn, $method, $id, $get_params, $post_data) {
    global $current_user_uid, $is_admin_request, $redis;
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    require_once 'api/prompts.md';

    try {
        if ($method === 'GET' && isset($get_params['action']) && $get_params['action'] == 'counts') {
            $cacheKey = 'showcase:counts';
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

            $result = $conn->query("SELECT promptId, COUNT(*) as count FROM showcase_images GROUP BY promptId");
            $counts = [];
            while ($row = $result->fetch_assoc()) {
                $counts[$row['promptId']] = (int)$row['count'];
            }
            $jsonResponse = json_encode($counts, JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);
            if ($redis) {
                $redis->set($cacheKey, $jsonResponse, ['ex' => 300]);
            }
            echo $jsonResponse;
            return;
        }
        switch($method) {
            case 'GET':
                // Pagination Logic
                if (isset($get_params['page'])) {
                    $page = max(1, intval($get_params['page']));
                    $limit = isset($get_params['limit']) ? intval($get_params['limit']) : 20;
                    $offset = ($page - 1) * $limit;
                    $searchTerm = $get_params['searchTerm'] ?? '';

                    $where_clauses = ["1=1"];
                    $params = [];
                    $types = "";

                    if (!empty($searchTerm)) {
                        $likeTerm = '%' . $searchTerm . '%';
                        $where_clauses[] = "(si.username LIKE ? OR p.text LIKE ?)";
                        $params[] = $likeTerm;
                        $params[] = $likeTerm;
                        $types .= "ss";
                    }

                    $where_sql = implode(" AND ", $where_clauses);

                    // Count Total
                    $count_sql = "SELECT COUNT(si.id) as total 
                                  FROM showcase_images si 
                                  LEFT JOIN prompts p ON si.promptId = p.id 
                                  WHERE $where_sql";
                    
                    $stmt_count = $conn->prepare($count_sql);
                    if (!empty($params)) {
                        $stmt_count->bind_param($types, ...$params);
                    }
                    $stmt_count->execute();
                    $total = $stmt_count->get_result()->fetch_assoc()['total'];
                    $stmt_count->close();

                    // Fetch Data
                    $data_sql = "SELECT si.*, u.photoURL as liveUserPhotoURL, p.text as promptText 
                                 FROM showcase_images si 
                                 LEFT JOIN users u ON si.userId = u.uid 
                                 LEFT JOIN prompts p ON si.promptId = p.id 
                                 WHERE $where_sql 
                                 ORDER BY si.createdAt DESC 
                                 LIMIT ? OFFSET ?";
                    
                    $stmt = $conn->prepare($data_sql);
                    $params[] = $limit;
                    $params[] = $offset;
                    $types .= "ii";
                    
                    $stmt->bind_param($types, ...$params);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    
                    $images = [];
                    while($row = $result->fetch_assoc()) {
                        $row['id'] = (string)$row['id'];
                        if (isset($row['liveUserPhotoURL'])) {
                            $row['userPhotoURL'] = $row['liveUserPhotoURL'];
                        }
                        unset($row['liveUserPhotoURL']);
                        $images[] = $row;
                    }
                    
                    send_json(['images' => $images, 'total' => (int)$total]);
                    return;
                }

                // Legacy / Public GET (All or by Prompt ID)
                $cacheKey = 'showcase:' . md5(http_build_query($get_params));
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

                if (isset($get_params['promptId'])) {
                    $stmt = $conn->prepare("SELECT si.*, u.photoURL as liveUserPhotoURL FROM showcase_images si LEFT JOIN users u ON si.userId = u.uid WHERE si.promptId = ? ORDER BY createdAt DESC");
                    $stmt->bind_param("i", $get_params['promptId']);
                } else {
                    $stmt = $conn->prepare("SELECT si.*, u.photoURL as liveUserPhotoURL FROM showcase_images si LEFT JOIN users u ON si.userId = u.uid ORDER BY createdAt DESC");
                }
                $stmt->execute();
                $result = $stmt->get_result();
                $images = [];
                while($row = $result->fetch_assoc()) {
                    $row['id'] = (string)$row['id'];
                    if (isset($row['liveUserPhotoURL'])) {
                        $row['userPhotoURL'] = $row['liveUserPhotoURL'];
                    }
                    unset($row['liveUserPhotoURL']);
                    $images[] = $row;
                }
                
                $jsonResponse = json_encode($images, JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);
                if ($redis) {
                    $redis->set($cacheKey, $jsonResponse, ['ex' => 300]);
                }
                echo $jsonResponse;
                break;
            case 'POST':
                clear_showcase_cache($redis);
                clear_prompts_cache($redis); // For showcase counts on prompt cards

                $data = $post_data;
                $stmt = $conn->prepare("INSERT INTO showcase_images (promptId, userId, username, userPhotoURL, imageUrl) VALUES (?, ?, ?, ?, ?)");
                $userPhotoURL = $data['userPhotoURL'] ?? null;
                $stmt->bind_param("issss", $data['promptId'], $data['userId'], $data['username'], $userPhotoURL, $data['imageUrl']);
                $stmt->execute();
                $newId = $stmt->insert_id;

                // Create a notification for the prompt author
                $prompt_stmt = $conn->prepare("SELECT authorId, text FROM prompts WHERE id = ?");
                $prompt_stmt->bind_param("s", $data['promptId']);
                $prompt_stmt->execute();
                $prompt_details = $prompt_stmt->get_result()->fetch_assoc();
                $prompt_stmt->close();

                if ($prompt_details && !empty($prompt_details['authorId']) && $prompt_details['authorId'] !== $data['userId']) {
                    $notification_stmt = $conn->prepare(
                        "INSERT INTO notifications (recipientId, actorId, actorName, actorPhotoURL, type, promptId, promptText, is_read, createdAt) VALUES (?, ?, ?, ?, 'showcase', ?, ?, 0, NOW())"
                    );
                    $prompt_text_snippet = mb_substr($prompt_details['text'], 0, 50);
                    $notification_stmt->bind_param(
                        "ssssis",
                        $prompt_details['authorId'],
                        $data['userId'],
                        $data['username'],
                        $userPhotoURL,
                        $data['promptId'],
                        $prompt_text_snippet
                    );
                    $notification_stmt->execute();
                    $notification_stmt->close();
                }

                $res_stmt = $conn->prepare("SELECT * FROM showcase_images WHERE id=?");
                $res_stmt->bind_param("i", $newId);
                $res_stmt->execute();
                $res = $res_stmt->get_result()->fetch_assoc();
                send_json($res);
                break;
            case 'DELETE':
                clear_showcase_cache($redis);
                clear_prompts_cache($redis); // For showcase counts on prompt cards
                
                if (!$id || !$current_user_uid) {
                    send_error('Missing ID or not authenticated.', 400);
                    return;
                }
            
                $stmt_check = $conn->prepare("SELECT userId FROM showcase_images WHERE id = ?");
                $stmt_check->bind_param("i", $id);
                $stmt_check->execute();
                $image_to_delete = $stmt_check->get_result()->fetch_assoc();
                $stmt_check->close();
            
                if (!$image_to_delete) {
                    send_error('Image not found.', 404);
                    return;
                }
            
                // A user can delete their own image, or an admin can delete any image.
                if ($is_admin_request || $current_user_uid === $image_to_delete['userId']) {
                    $stmt_delete = $conn->prepare("DELETE FROM showcase_images WHERE id = ?");
                    $stmt_delete->bind_param("i", $id);
                    $stmt_delete->execute();
                    send_json(['id' => (string)$id]);
                } else {
                    send_error('Forbidden: You do not have permission to delete this image.', 403);
                }
                break;
            default:
                send_error('Method not allowed', 405);
                break;
        }
    } catch (Exception $e) {
        send_error("Database error in showcase_images handler: " . $e->getMessage(), 500);
    }
}
?>