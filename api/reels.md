
<?php
function clear_reels_cache($redis) {
    if (!$redis) return;
    $keys = $redis->keys('reels:*');
    if ($keys && count($keys) > 0) {
        $redis->del($keys);
    }
}

function handle_reels($conn, $method, $id, $get_params, $post_data) {
    global $current_user_uid, $is_admin_request, $redis;
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

    // Check for column existence once at the beginning of the function
    $is_nsfw_column_exists = $conn->query("SHOW COLUMNS FROM `reels` LIKE 'isNSFW'")->num_rows > 0;
    $is_image_url_column_exists = $conn->query("SHOW COLUMNS FROM `reels` LIKE 'imageUrl'")->num_rows > 0;
    $is_video_thumbnail_column_exists = $conn->query("SHOW COLUMNS FROM `reels` LIKE 'videoThumbnail'")->num_rows > 0;

    try {
        if ($method === 'POST' && isset($get_params['action'])) {
            if (!$id) send_error('Reel ID is required.', 400);
            if (!$current_user_uid) send_error('Authentication required.', 401);
            
            clear_reels_cache($redis);

            if ($get_params['action'] === 'like') {
                $conn->begin_transaction();
                try {
                    $stmt_check = $conn->prepare("SELECT 1 FROM user_reel_likes WHERE userId = ? AND reelId = ?");
                    $stmt_check->bind_param("si", $current_user_uid, $id);
                    $stmt_check->execute();
                    $is_liked = $stmt_check->get_result()->num_rows > 0;
                    $stmt_check->close();

                    if ($is_liked) {
                        $stmt_delete = $conn->prepare("DELETE FROM user_reel_likes WHERE userId = ? AND reelId = ?");
                        $stmt_delete->bind_param("si", $current_user_uid, $id);
                        $stmt_delete->execute();
                        $increment = -1;
                    } else {
                        $stmt_insert = $conn->prepare("INSERT INTO user_reel_likes (userId, reelId) VALUES (?, ?)");
                        $stmt_insert->bind_param("si", $current_user_uid, $id);
                        $stmt_insert->execute();
                        $increment = 1;
                    }

                    $stmt_update_count = $conn->prepare("UPDATE reels SET likeCount = GREATEST(0, IFNULL(likeCount, 0) + ?) WHERE id = ?");
                    $stmt_update_count->bind_param("ii", $increment, $id);
                    $stmt_update_count->execute();

                    $conn->commit();
                    send_json(['status' => 'ok', 'liked' => !$is_liked]);

                } catch (Exception $e) {
                    $conn->rollback();
                    throw $e;
                }
            } elseif ($get_params['action'] === 'view') {
                $stmt = $conn->prepare("UPDATE reels SET viewCount = IFNULL(viewCount, 0) + 1 WHERE id = ?");
                $stmt->bind_param("i", $id);
                $stmt->execute();
                send_json(['status' => 'ok']);
            }
            return;
        }

        switch ($method) {
            case 'GET':
                if ($id) {
                    // ADD CACHING FOR SINGLE REEL FETCH
                    $cacheKey = 'reels:id:' . $id;
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

                    $stmt = $conn->prepare("SELECT r.*, u.photoURL as authorPhotoURL FROM reels r LEFT JOIN users u ON r.authorId = u.uid WHERE r.id = ?");
                    if (!$stmt) send_error('Database query preparation failed.', 500);
                    $stmt->bind_param("i", $id);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    $reel = $result->fetch_assoc();
                    $stmt->close();

                    if ($reel) {
                        $reel['id'] = (string)$reel['id'];
                        $reel['promptId'] = $reel['promptId'] ? (string)$reel['promptId'] : null;
                        $reel['tags'] = json_decode($reel['tags'] ?: '[]');
                        $reel['categoryIds'] = json_decode($reel['categoryIds'] ?: '[]');
                        $reel['status'] = $reel['status'] ?? 'approved';
                        $reel['viewCount'] = (int)($reel['viewCount'] ?? 0);
                        $reel['likeCount'] = (int)($reel['likeCount'] ?? 0);
                        $reel['commentCount'] = (int)($reel['commentCount'] ?? 0);
                        $reel['authorPhotoURL'] = $reel['authorPhotoURL'] ?? null;
                        $reel['isNSFW'] = (bool)($reel['isNSFW'] ?? false);
                        $reel['imageUrl'] = $reel['imageUrl'] ?? null; // Might contain JSON string
                        $reel['videoThumbnail'] = $reel['videoThumbnail'] ?? null; // Add videoThumbnail
                        
                        $is_owner = $current_user_uid && $reel['authorId'] === $current_user_uid;
                        if ($is_admin_request || $reel['status'] === 'approved' || $is_owner) {
                            $jsonResponse = json_encode($reel, JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);
                            if ($redis) {
                                // Cache for 1 hour
                                $redis->set($cacheKey, $jsonResponse, ['ex' => 3600]);
                            }
                            echo $jsonResponse;
                        } else {
                            send_error("Reel not found or you don't have permission to view it.", 404);
                        }
                    } else {
                        send_error("Reel not found.", 404);
                    }
                    return;
                }

                $cacheKey = 'reels:' . md5(http_build_query(array_merge($get_params, ['uid' => $current_user_uid])));
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

                $limit = isset($get_params['limit']) ? intval($get_params['limit']) : 10;
                $page = isset($get_params['page']) ? intval($get_params['page']) : 1;
                $offset = ($page - 1) * $limit;
                $sortBy = $get_params['sortBy'] ?? 'newest';
                
                $where_clauses = [];
                $params = [];
                $types = '';

                if (!$is_admin_request) {
                    $where_clauses[] = "r.status = 'approved'";
                }

                if (!empty($get_params['searchTerm'])) {
                    $searchTerm = '%' . $get_params['searchTerm'] . '%';
                    $where_clauses[] = "(r.title LIKE ? OR r.authorName LIKE ? OR r.tags LIKE ?)";
                    array_push($params, $searchTerm, $searchTerm, $searchTerm);
                    $types .= 'sss';
                }
                
                if (!empty($get_params['category']) && $get_params['category'] !== 'All') {
                    $where_clauses[] = "JSON_CONTAINS(r.categoryIds, JSON_QUOTE(?), '$')";
                    $params[] = $get_params['category'];
                    $types .= 's';
                }

                $where_sql = count($where_clauses) > 0 ? ' WHERE ' . implode(' AND ', $where_clauses) : '';

                $total_sql = "SELECT COUNT(r.id) as total FROM reels r" . $where_sql;
                $stmt_total = $conn->prepare($total_sql);
                if (!empty($types)) $stmt_total->bind_param($types, ...$params);
                $stmt_total->execute();
                $total = $stmt_total->get_result()->fetch_assoc()['total'];
                $stmt_total->close();

                $order_by_sql = " ORDER BY " . ($sortBy === 'oldest' ? 'r.createdAt ASC, r.id ASC' : 'r.createdAt DESC, r.id DESC');

                $data_sql = "SELECT r.*, u.photoURL as authorPhotoURL FROM reels r LEFT JOIN users u ON r.authorId = u.uid" . $where_sql . $order_by_sql . " LIMIT ? OFFSET ?";
                $stmt = $conn->prepare($data_sql);
                
                $data_params = $params;
                $data_types = $types;
                array_push($data_params, $limit, $offset);
                $data_types .= 'ii';

                if (!empty($data_types)) {
                    $stmt->bind_param($data_types, ...$data_params);
                } else {
                    $stmt->bind_param("ii", $limit, $offset);
                }
                
                $stmt->execute();
                $result = $stmt->get_result();
                $reels = [];
                while ($row = $result->fetch_assoc()) {
                    $row['id'] = (string)$row['id'];
                    $row['promptId'] = $row['promptId'] ? (string)$row['promptId'] : null;
                    $row['tags'] = json_decode($row['tags'] ?: '[]');
                    $row['categoryIds'] = json_decode($row['categoryIds'] ?: '[]');
                    $row['status'] = $row['status'] ?? 'approved';
                    $row['viewCount'] = (int)($row['viewCount'] ?? 0);
                    $row['likeCount'] = (int)($row['likeCount'] ?? 0);
                    $row['commentCount'] = (int)($row['commentCount'] ?? 0);
                    $row['authorPhotoURL'] = $row['authorPhotoURL'] ?? null;
                    $row['isNSFW'] = (bool)($row['isNSFW'] ?? false);
                    $row['imageUrl'] = $row['imageUrl'] ?? null;
                    $row['videoThumbnail'] = $row['videoThumbnail'] ?? null; // Include thumbnail in list
                    $reels[] = $row;
                }

                $response = ['reels' => $reels, 'total' => (int)$total];
                
                if ($current_user_uid) {
                    $reel_ids = array_column($reels, 'id');
                    if (!empty($reel_ids)) {
                        $likes_stmt = $conn->prepare("SELECT reelId FROM user_reel_likes WHERE userId = ? AND reelId IN (" . implode(',', array_fill(0, count($reel_ids), '?')) . ")");
                        $types = 's' . str_repeat('i', count($reel_ids));
                        $likes_stmt->bind_param($types, $current_user_uid, ...$reel_ids);
                        $likes_stmt->execute();
                        $liked_result = $likes_stmt->get_result();
                        $liked_ids = [];
                        while ($row = $liked_result->fetch_assoc()) {
                            $liked_ids[$row['reelId']] = true;
                        }
                        $response['likedIds'] = $liked_ids;
                    }
                }
                
                $jsonResponse = json_encode($response, JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);
                if ($redis) {
                    $redis->set($cacheKey, $jsonResponse, ['ex' => 300]);
                }
                echo $jsonResponse;
                break;

            case 'POST':
                clear_reels_cache($redis);
                if (!$current_user_uid) send_error('Authentication required.', 401);
                $data = $post_data;

                // SECURITY FIX: Sanitize array inputs
                $raw_tags = $data['tags'] ?? [];
                $safe_tags = array_map(function($tag) { return htmlspecialchars($tag, ENT_QUOTES, 'UTF-8'); }, $raw_tags);
                $tags = json_encode($safe_tags);

                $raw_categoryIds = $data['categoryIds'] ?? [];
                $safe_categoryIds = array_map(function($id) { return htmlspecialchars($id, ENT_QUOTES, 'UTF-8'); }, $raw_categoryIds);
                $categoryIds = json_encode($safe_categoryIds);

                $status = $is_admin_request ? ($data['status'] ?? 'approved') : 'pending';
                $promptId = isset($data['promptId']) && !empty($data['promptId']) ? (int)$data['promptId'] : null;

                $sql_columns = "title, videoUrl, authorId, authorName, tags, status, promptId, categoryIds";
                $sql_placeholders = "?, ?, ?, ?, ?, ?, ?, ?";
                $types = "ssssssis";
                
                $user_stmt = $conn->prepare("SELECT username FROM users WHERE uid = ?");
                $user_stmt->bind_param("s", $current_user_uid);
                $user_stmt->execute();
                $user = $user_stmt->get_result()->fetch_assoc();
                if (!$user) {
                    send_error('Authenticated user profile not found.', 404);
                    return;
                }
                $authorName = $user['username'];
                
                $params = [
                    htmlspecialchars($data['title'], ENT_QUOTES, 'UTF-8'),
                    $data['videoUrl'],
                    $current_user_uid,
                    $authorName,
                    $tags,
                    $status,
                    $promptId,
                    $categoryIds
                ];

                if ($is_nsfw_column_exists) {
                    $sql_columns .= ", isNSFW";
                    $sql_placeholders .= ", ?";
                    $types .= "i";
                    $params[] = isset($data['isNSFW']) ? (int)$data['isNSFW'] : 0;
                }

                if ($is_image_url_column_exists) {
                    $sql_columns .= ", imageUrl";
                    $sql_placeholders .= ", ?";
                    $types .= "s";
                    $params[] = $data['imageUrl'] ?? null;
                }

                if ($is_video_thumbnail_column_exists) {
                    $sql_columns .= ", videoThumbnail";
                    $sql_placeholders .= ", ?";
                    $types .= "s";
                    $params[] = $data['videoThumbnail'] ?? null;
                }

                $stmt = $conn->prepare("INSERT INTO reels ($sql_columns) VALUES ($sql_placeholders)");
                $stmt->bind_param($types, ...$params);
                $stmt->execute();
                $newId = $stmt->insert_id;
                
                $res_stmt = $conn->prepare("SELECT * FROM reels WHERE id=?");
                $res_stmt->bind_param("i", $newId);
                $res_stmt->execute();
                $res = $res_stmt->get_result()->fetch_assoc();
                $res['id'] = (string)$res['id'];
                $res['tags'] = json_decode($res['tags']);
                $res['categoryIds'] = json_decode($res['categoryIds']);
                $res['isNSFW'] = (bool)($res['isNSFW'] ?? false);
                send_json($res);
                break;
                
            case 'PUT':
                clear_reels_cache($redis);
                if (!$id) send_error('Missing ID.', 400);

                $stmt_check = $conn->prepare("SELECT authorId FROM reels WHERE id = ?");
                $stmt_check->bind_param("i", $id);
                $stmt_check->execute();
                $reel_to_edit = $stmt_check->get_result()->fetch_assoc();
                $stmt_check->close();

                if (!$reel_to_edit) {
                    send_error('Reel not found.', 404);
                    return;
                }

                if (!$is_admin_request && $current_user_uid !== $reel_to_edit['authorId']) {
                    send_error('Forbidden: You can only edit your own reels.', 403);
                    return;
                }

                $data = $post_data;
                
                // SECURITY FIX: Sanitize array inputs
                $raw_tags = $data['tags'] ?? [];
                $safe_tags = array_map(function($tag) { return htmlspecialchars($tag, ENT_QUOTES, 'UTF-8'); }, $raw_tags);
                $tags = json_encode($safe_tags);

                $raw_categoryIds = $data['categoryIds'] ?? [];
                $safe_categoryIds = array_map(function($id) { return htmlspecialchars($id, ENT_QUOTES, 'UTF-8'); }, $raw_categoryIds);
                $categoryIds = json_encode($safe_categoryIds);

                $promptId = isset($data['promptId']) && !empty($data['promptId']) ? (int)$data['promptId'] : null;
                $sanitized_title = htmlspecialchars($data['title'], ENT_QUOTES, 'UTF-8');
                $status = $is_admin_request ? ($data['status'] ?? 'approved') : 'pending';
                
                $sql_update = "UPDATE reels SET title=?, videoUrl=?, tags=?, status=?, promptId=?, categoryIds=?";
                $types = "ssssis";
                $params = [$sanitized_title, $data['videoUrl'], $tags, $status, $promptId, $categoryIds];

                if ($is_nsfw_column_exists) {
                    $sql_update .= ", isNSFW=?";
                    $types .= "i";
                    $params[] = isset($data['isNSFW']) ? (int)$data['isNSFW'] : 0;
                }

                if ($is_image_url_column_exists) {
                    $sql_update .= ", imageUrl=?";
                    $types .= "s";
                    $params[] = $data['imageUrl'] ?? null;
                }

                if ($is_video_thumbnail_column_exists) {
                    $sql_update .= ", videoThumbnail=?";
                    $types .= "s";
                    $params[] = $data['videoThumbnail'] ?? null;
                }

                $sql_update .= " WHERE id=?";
                $types .= "i";
                $params[] = $id;

                $stmt = $conn->prepare($sql_update);
                $stmt->bind_param($types, ...$params);
                $stmt->execute();
                send_json($data);
                break;

            case 'DELETE':
                clear_reels_cache($redis);
                if (!$id) send_error('Missing ID.', 400);

                $stmt_check = $conn->prepare("SELECT authorId FROM reels WHERE id = ?");
                $stmt_check->bind_param("i", $id);
                $stmt_check->execute();
                $reel_to_delete = $stmt_check->get_result()->fetch_assoc();
                $stmt_check->close();

                if (!$reel_to_delete) {
                    send_error('Reel not found.', 404);
                    return;
                }

                if (!$is_admin_request && $current_user_uid !== $reel_to_delete['authorId']) {
                    send_error('Forbidden: You can only delete your own reels.', 403);
                    return;
                }

                $stmt = $conn->prepare("DELETE FROM reels WHERE id = ?");
                $stmt->bind_param("i", $id);
                $stmt->execute();
                send_json(['id' => (string)$id]);
                break;

            default:
                send_error('Method not allowed', 405);
                break;
        }
    } catch (Exception $e) {
        if (isset($conn) && $conn->in_transaction) $conn->rollback();
        send_error("Database error in reels handler: " . $e->getMessage(), 500);
    }
}
?>