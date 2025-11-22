<?php
function clear_posts_cache($redis) {
    if (!$redis) return;
    $keys = $redis->keys('posts:*');
    if ($keys && count($keys) > 0) {
        $redis->del($keys);
    }
}

function sanitize_rich_text($html) {
    if (!$html) return '';
    
    // 1. Allow basic tags
    $allowed_tags = '<p><a><b><i><u><ul><ol><li><blockquote><h1><h2><h3><h4><h5><h6><br><img><video><div><span>';
    $cleaned = strip_tags($html, $allowed_tags);

    // 2. Remove dangerous attributes (on*, javascript:, data:, vbscript:)
    // Remove any attribute starting with 'on' (onclick, onerror, etc.)
    $cleaned = preg_replace('/\s(on[a-z]+)\s*=\s*[\"\'][^\"\']*[\"\']/i', '', $cleaned);
    
    // Remove javascript:/vbscript:/data: from href and src
    $cleaned = preg_replace('/\s(href|src)\s*=\s*[\"\']\s*(javascript|vbscript|data):[^\"\']*[\"\']/i', ' $1="#"', $cleaned);
    
    return $cleaned;
}

function handle_posts($conn, $method, $id, $get_params, $post_data) {
    global $current_user_uid, $is_admin_request, $redis;
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

    try {
        // Combined Sidebar Data Action (Optimization)
        if ($method === 'GET' && isset($get_params['action']) && $get_params['action'] === 'sidebar_data') {
            $cacheKey = 'posts:sidebar_data';
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

            $response = [];

            // 1. Most Viewed (Limit 5)
            $viewed_sql = "SELECT p.*, u.username as authorName, u.photoURL as authorPhotoURL FROM posts p LEFT JOIN users u ON p.authorId = u.uid WHERE p.status = 'published' ORDER BY p.viewCount DESC LIMIT 5";
            $result_viewed = $conn->query($viewed_sql);
            $mostViewed = [];
            while ($row = $result_viewed->fetch_assoc()) {
                $row['id'] = (string)$row['id'];
                $row['categoryIds'] = json_decode($row['categoryIds'] ?: '[]');
                $row['tags'] = json_decode($row['tags'] ?: '[]');
                $row['post_meta'] = json_decode($row['post_meta'] ?: '{}', true);
                $row['viewCount'] = (int)($row['viewCount'] ?? 0);
                $mostViewed[] = $row;
            }
            $response['mostViewed'] = $mostViewed;

            // 2. Most Commented (Limit 5)
            $commented_sql = "SELECT p.*, u.username as authorName, u.photoURL as authorPhotoURL FROM posts p LEFT JOIN users u ON p.authorId = u.uid WHERE p.status = 'published' ORDER BY p.commentCount DESC LIMIT 5";
            $result_commented = $conn->query($commented_sql);
            $mostCommented = [];
            while ($row = $result_commented->fetch_assoc()) {
                $row['id'] = (string)$row['id'];
                $row['categoryIds'] = json_decode($row['categoryIds'] ?: '[]');
                $row['tags'] = json_decode($row['tags'] ?: '[]');
                $row['post_meta'] = json_decode($row['post_meta'] ?: '{}', true);
                $row['commentCount'] = (int)($row['commentCount'] ?? 0);
                $mostCommented[] = $row;
            }
            $response['mostCommented'] = $mostCommented;

            // 3. Tags
            $tags_result = $conn->query("SELECT tags FROM posts WHERE tags IS NOT NULL AND tags != '[]' AND status = 'published'");
            $tag_set = [];
            while ($row = $tags_result->fetch_assoc()) {
                $decoded_tags = json_decode($row['tags'] ?: '[]');
                if (is_array($decoded_tags)) {
                    foreach ($decoded_tags as $tag) {
                        if (!empty($tag)) $tag_set[$tag] = true;
                    }
                }
            }
            $all_tags = array_keys($tag_set);
            sort($all_tags);
            $response['tags'] = $all_tags;

            $jsonResponse = json_encode($response, JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);
            if ($redis) {
                $redis->set($cacheKey, $jsonResponse, ['ex' => 300]); // Cache for 5 minutes
            }
            echo $jsonResponse;
            return;
        }

        if ($method === 'GET' && isset($get_params['action']) && $get_params['action'] === 'get_tags') {
            $result = $conn->query("SELECT tags FROM posts WHERE tags IS NOT NULL AND tags != '[]'");
            $tag_set = [];
            while ($row = $result->fetch_assoc()) {
                $decoded_tags = json_decode($row['tags'] ?: '[]');
                if (is_array($decoded_tags)) {
                    foreach ($decoded_tags as $tag) {
                        if (!empty($tag)) $tag_set[$tag] = true;
                    }
                }
            }
            $all_tags = array_keys($tag_set);
            sort($all_tags);
            send_json($all_tags);
            return;
        }

        if ($method === 'POST' && isset($get_params['action']) && $get_params['action'] === 'increment_view' && $id) {
            $stmt = $conn->prepare("UPDATE posts SET viewCount = IFNULL(viewCount, 0) + 1 WHERE id = ?");
            if (!$stmt) send_error('Database query preparation failed.', 500);
            $stmt->bind_param("i", $id);
            $stmt->execute();
            send_json(['status' => 'ok']);
            return;
        }

        switch ($method) {
            case 'GET':
                $cacheKey = 'posts:' . md5(http_build_query($get_params));
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

                if ($id) {
                    $stmt = $conn->prepare("SELECT p.*, u.username as authorName, u.photoURL as authorPhotoURL FROM posts p LEFT JOIN users u ON p.authorId = u.uid WHERE p.id = ?");
                    if (!$stmt) send_error('Database query preparation failed.', 500);
                    $stmt->bind_param("i", $id);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    $post = $result->fetch_assoc();
                    $stmt->close();

                    if ($post) {
                        $post['id'] = (string)$post['id'];
                        $post['categoryIds'] = json_decode($post['categoryIds'] ?: '[]');
                        $post['tags'] = json_decode($post['tags'] ?: '[]');
                        $post['post_meta'] = json_decode($post['post_meta'] ?: '{}', true);
                        $post['commentsEnabled'] = (bool)($post['commentsEnabled'] ?? true);
                        $post['status'] = $post['status'] ?? 'published'; // Default to published if not set
                        $post['viewCount'] = (int)($post['viewCount'] ?? 0);
                        $post['rotation'] = (int)($post['rotation'] ?? 0);
                        $post['authorPhotoURL'] = $post['authorPhotoURL'] ?? null;
                        
                        // Security check: Only show post if it's published, or if the viewer is the owner or an admin.
                        $is_owner = $current_user_uid && $post['authorId'] === $current_user_uid;
                        if ($is_admin_request || $post['status'] === 'published' || $is_owner) {
                            $jsonResponse = json_encode($post, JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);
                            if ($redis) {
                                $redis->set($cacheKey, $jsonResponse, ['ex' => 300]);
                            }
                            echo $jsonResponse;
                        } else {
                            send_error("Post not found.", 404);
                        }
                    } else {
                        send_error("Post not found.", 404);
                    }
                    return; // End execution here for single post fetch
                }

                $limit = isset($get_params['limit']) ? intval($get_params['limit']) : 20;
                $page = isset($get_params['page']) ? intval($get_params['page']) : 1;
                $offset = ($page - 1) * $limit;
                $sortBy = $get_params['sortBy'] ?? 'newest';

                $where_clauses = [];
                $params = [];
                $types = '';

                $is_admin_view = $is_admin_request && isset($get_params['isAdmin']) && $get_params['isAdmin'] === 'true';

                if (!$is_admin_view) {
                    // For public view, only show 'published' posts.
                    $where_clauses[] = "p.status = 'published'";
                }
                
                if (!empty($get_params['searchTerm'])) {
                    $searchTerm = '%' . $get_params['searchTerm'] . '%';
                    $where_clauses[] = "(p.title LIKE ? OR p.content LIKE ? OR p.authorName LIKE ? OR JSON_CONTAINS(p.tags, JSON_QUOTE(?), '$'))";
                    array_push($params, $searchTerm, $searchTerm, $searchTerm, $get_params['searchTerm']);
                    $types .= 'ssss';
                }

                if (!empty($get_params['category']) && $get_params['category'] !== 'All') {
                    $where_clauses[] = "JSON_CONTAINS(p.categoryIds, JSON_QUOTE(?), '$')";
                    $params[] = $get_params['category'];
                    $types .= 's';
                }
                
                if (!empty($get_params['author']) && $get_params['author'] !== 'all') {
                    $where_clauses[] = "p.authorId = ?";
                    $params[] = $get_params['author'];
                    $types .= 's';
                }

                $where_sql = count($where_clauses) > 0 ? ' WHERE ' . implode(' AND ', $where_clauses) : '';

                $total_sql = "SELECT COUNT(p.id) as total FROM posts p" . $where_sql;
                $stmt_total = $conn->prepare($total_sql);
                if (!empty($types)) $stmt_total->bind_param($types, ...$params);
                $stmt_total->execute();
                $total = $stmt_total->get_result()->fetch_assoc()['total'];
                $stmt_total->close();

                $order_by_map = [
                    'oldest' => 'p.createdAt ASC',
                    'views' => 'p.viewCount DESC',
                    'comments' => 'p.commentCount DESC'
                ];
                $order_by_sql = " ORDER BY " . ($order_by_map[$sortBy] ?? 'p.createdAt DESC');

                $data_sql = "SELECT p.*, u.username as authorName, u.photoURL as authorPhotoURL FROM posts p LEFT JOIN users u ON p.authorId = u.uid" . $where_sql . $order_by_sql . " LIMIT ? OFFSET ?";
                $stmt_data = $conn->prepare($data_sql);
                
                $data_params = $params;
                $data_types = $types;
                array_push($data_params, $limit, $offset);
                $data_types .= 'ii';

                if (!empty($data_types)) $stmt_data->bind_param($data_types, ...$data_params);
                $stmt_data->execute();
                $result = $stmt_data->get_result();
                $posts = [];
                while ($row = $result->fetch_assoc()) {
                    $row['id'] = (string)$row['id'];
                    $row['categoryIds'] = json_decode($row['categoryIds'] ?: '[]');
                    $row['tags'] = json_decode($row['tags'] ?: '[]');
                    $row['post_meta'] = json_decode($row['post_meta'] ?: '{}', true);
                    $row['commentsEnabled'] = (bool)($row['commentsEnabled'] ?? true);
                    $row['status'] = $row['status'] ?? 'published';
                    $row['viewCount'] = (int)($row['viewCount'] ?? 0);
                    $row['rotation'] = (int)($row['rotation'] ?? 0);
                    $row['authorPhotoURL'] = $row['authorPhotoURL'] ?? null;
                    $posts[] = $row;
                }
                $stmt_data->close();
                
                $response = ['posts' => $posts, 'total' => $total];
                $jsonResponse = json_encode($response, JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);
                if ($redis) {
                    $redis->set($cacheKey, $jsonResponse, ['ex' => 300]);
                }
                echo $jsonResponse;
                break;

            case 'POST':
                clear_posts_cache($redis);
                if (!$current_user_uid) send_error('Authentication required', 401);
                $data = $post_data;
                $conn->begin_transaction();
                
                try {
                    // SECURITY: Sanitize Array Inputs
                    $raw_categoryIds = $data['categoryIds'] ?? [];
                    $safe_categoryIds = array_map(function($id) { return htmlspecialchars($id, ENT_QUOTES, 'UTF-8'); }, $raw_categoryIds);
                    $categoryIds = json_encode($safe_categoryIds);

                    $raw_tags = $data['tags'] ?? [];
                    $safe_tags = array_map(function($tag) { return htmlspecialchars($tag, ENT_QUOTES, 'UTF-8'); }, $raw_tags);
                    $tags = json_encode($safe_tags);

                    $post_meta = isset($data['post_meta']) && is_array($data['post_meta']) ? json_encode($data['post_meta']) : null;
                    
                    $sql_columns = "title, content, imageUrl, videoUrl, categoryIds, tags, authorId, authorName, commentsEnabled, rotation, status, post_meta";
                    $sql_placeholders = "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?";
                    $types = "ssssssssiiss";
                    
                    // SECURITY: Force status to pending if not admin
                    $status = $is_admin_request ? ($data['status'] ?? 'published') : 'pending';
                    
                    // SECURITY: Enforce authorId as current user
                    $authorId = $current_user_uid;
                    $stmt_user = $conn->prepare("SELECT username FROM users WHERE uid = ?");
                    $stmt_user->bind_param("s", $authorId);
                    $stmt_user->execute();
                    $authorName = $stmt_user->get_result()->fetch_assoc()['username'] ?? 'Unknown';
                    $stmt_user->close();
                    
                    // Sanitize HTML content with improved cleaner
                    $sanitized_content = sanitize_rich_text($data['content']);

                    $params = [
                        htmlspecialchars($data['title'], ENT_QUOTES, 'UTF-8'),
                        $sanitized_content,
                        $data['imageUrl'], $data['videoUrl'] ?? null, $categoryIds, $tags, $authorId, $authorName,
                        isset($data['commentsEnabled']) ? (int)$data['commentsEnabled'] : 1,
                        isset($data['rotation']) ? (int)$data['rotation'] : 0,
                        $status,
                        $post_meta
                    ];
                    
                    $stmt = $conn->prepare("INSERT INTO posts ($sql_columns) VALUES ($sql_placeholders)");
                    $stmt->bind_param($types, ...$params);
                    $stmt->execute();
                    $newId = $stmt->insert_id;
                    $stmt->close();
                    
                    $conn->commit();

                    $res_stmt = $conn->prepare("SELECT * FROM posts WHERE id=?");
                    $res_stmt->bind_param("i", $newId);
                    $res_stmt->execute();
                    $res = $res_stmt->get_result()->fetch_assoc();
                    $res['id'] = (string)$res['id'];
                    $res['categoryIds'] = json_decode($res['categoryIds']);
                    $res['tags'] = json_decode($res['tags']);
                    $res['post_meta'] = json_decode($res['post_meta'] ?: '{}', true);
                    send_json($res);
                } catch (Exception $e) {
                    $conn->rollback();
                    throw $e;
                }
                break;
            case 'PUT':
                clear_posts_cache($redis);
                if (!$id) send_error('Missing ID for PUT request', 400);
                if (!$current_user_uid) send_error('Authentication required', 401);
                
                $stmt_check = $conn->prepare("SELECT authorId FROM posts WHERE id = ?");
                $stmt_check->bind_param("i", $id);
                $stmt_check->execute();
                $post_to_edit = $stmt_check->get_result()->fetch_assoc();
                $stmt_check->close();

                if (!$post_to_edit) { send_error('Post not found.', 404); return; }

                // SECURITY: Check ownership
                if (!$is_admin_request && $current_user_uid !== $post_to_edit['authorId']) {
                    send_error('Forbidden: You can only edit your own posts.', 403);
                    return;
                }
                
                $data = $post_data;
                $post_meta = isset($data['post_meta']) && is_array($data['post_meta']) ? json_encode($data['post_meta']) : null;
                
                // Sanitize HTML content
                $sanitized_content = sanitize_rich_text($data['content']);

                // SECURITY: Sanitize Array Inputs
                $raw_categoryIds = $data['categoryIds'] ?? [];
                $safe_categoryIds = array_map(function($id) { return htmlspecialchars($id, ENT_QUOTES, 'UTF-8'); }, $raw_categoryIds);
                $categoryIds = json_encode($safe_categoryIds);

                $raw_tags = $data['tags'] ?? [];
                $safe_tags = array_map(function($tag) { return htmlspecialchars($tag, ENT_QUOTES, 'UTF-8'); }, $raw_tags);
                $tags = json_encode($safe_tags);

                $sql_fields_arr = ["title=?", "content=?", "imageUrl=?", "videoUrl=?", "categoryIds=?", "tags=?", "commentsEnabled=?", "rotation=?", "status=?", "post_meta=?"];
                $types = "ssssssiiss";
                
                // SECURITY: Only admins can change status arbitrarily. Users reset to pending on edit.
                $status = $is_admin_request ? ($data['status'] ?? 'published') : 'pending';

                $params = [
                    htmlspecialchars($data['title'], ENT_QUOTES, 'UTF-8'),
                    $sanitized_content,
                    $data['imageUrl'], $data['videoUrl'] ?? null, $categoryIds, $tags,
                    isset($data['commentsEnabled']) ? (int)$data['commentsEnabled'] : 1,
                    isset($data['rotation']) ? (int)$data['rotation'] : 0,
                    $status,
                    $post_meta
                ];
                
                $sql_fields = implode(', ', $sql_fields_arr);
                $stmt = $conn->prepare("UPDATE posts SET $sql_fields WHERE id=?");
                $types .= "i";
                $params[] = $id;
                $stmt->bind_param($types, ...$params);
                $stmt->execute();
                
                send_json($data);
                break;
            case 'DELETE':
                clear_posts_cache($redis);
                if (!$id) send_error('Missing ID for DELETE request', 400);
                if (!$current_user_uid) send_error('Authentication required', 401);

                $stmt_check = $conn->prepare("SELECT authorId FROM posts WHERE id = ?");
                $stmt_check->bind_param("i", $id);
                $stmt_check->execute();
                $post_to_delete = $stmt_check->get_result()->fetch_assoc();
                $stmt_check->close();

                if (!$post_to_delete) { send_error('Post not found.', 404); return; }

                // SECURITY: Check ownership
                if (!$is_admin_request && $current_user_uid !== $post_to_delete['authorId']) {
                    send_error('Forbidden: You can only delete your own posts.', 403);
                    return;
                }

                $stmt = $conn->prepare("DELETE FROM posts WHERE id = ?");
                $stmt->bind_param("i", $id);
                $stmt->execute();
                send_json(['id' => (string)$id]);
                break;
            default:
                send_error('Method not allowed', 405);
                break;
        }
    } catch (Exception $e) {
        if ($conn->in_transaction) $conn->rollback();
        send_error("Database error in posts handler: " . $e->getMessage(), 500);
    }
}
?>