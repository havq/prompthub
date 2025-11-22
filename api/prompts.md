<?php
function clear_prompts_cache($redis) {
    if (!$redis) return;
    $keys = $redis->keys('prompts:*');
    if ($keys && count($keys) > 0) {
        $redis->del($keys);
    }
}

// Helper to clear categories cache and Update DB Counts (Hybrid Solution)
function sync_categories_data($redis, $conn) {
    // 1. Clear Redis Cache
    if ($redis) {
        $keys = $redis->keys('categories:*');
        if ($keys && count($keys) > 0) {
            $redis->del($keys);
        }
    }
    
    // 2. Update DB Counts
    if (!function_exists('update_all_category_counts')) {
        if (file_exists('api/categories.php')) {
            require_once 'api/categories.php';
        } elseif (file_exists('categories.php')) {
            require_once 'categories.php';
        }
    }

    if (function_exists('update_all_category_counts')) {
        update_all_category_counts($conn);
    }
}

function handle_prompts($conn, $method, $id, $get_params, $post_data) {
    global $current_user_uid, $is_admin_request, $redis;
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

    // Check for columns existence to prevent SQL errors on older DB schemas
    $is_status_column_exists = $conn->query("SHOW COLUMNS FROM `prompts` LIKE 'status'")->num_rows > 0;
    $is_private_column_exists = $conn->query("SHOW COLUMNS FROM `prompts` LIKE 'isPrivate'")->num_rows > 0;
    $is_nsfw_column_exists = $conn->query("SHOW COLUMNS FROM `prompts` LIKE 'isNSFW'")->num_rows > 0;
    $is_prompt_note_exists = $conn->query("SHOW COLUMNS FROM `prompts` LIKE 'promptNote'")->num_rows > 0;
    $is_prompt_source_exists = $conn->query("SHOW COLUMNS FROM `prompts` LIKE 'promptSource'")->num_rows > 0;

    try {
        if ($method === 'POST' && isset($get_params['action']) && $get_params['action'] === 'increment_view' && $id) {
            $stmt = $conn->prepare("UPDATE prompts SET viewCount = IFNULL(viewCount, 0) + 1 WHERE id = ?");
            if (!$stmt) send_error('Database query preparation failed.', 500);
            $stmt->bind_param("i", $id);
            $stmt->execute();
            send_json(['status' => 'ok']);
            return;
        }

        switch ($method) {
            case 'GET':
                $cacheKey = 'prompts:' . md5(http_build_query($get_params));
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
                    // Fetch prompt with live user avatar
                    $stmt = $conn->prepare("SELECT prompts.*, users.photoURL as authorPhotoURL FROM prompts LEFT JOIN users ON prompts.authorId = users.uid WHERE prompts.id = ?");
                    if (!$stmt) send_error('Database query preparation failed.', 500);
                    $stmt->bind_param("i", $id);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    $prompt = $result->fetch_assoc();
                    $stmt->close();

                    if ($prompt) {
                        // Security check: Hide private prompts if not author and not admin
                        $is_owner = $current_user_uid && $prompt['authorId'] === $current_user_uid;
                        $is_private = isset($prompt['isPrivate']) && $prompt['isPrivate'];
                        
                        if ($is_private && !$is_owner && !$is_admin_request) {
                             send_error("Prompt not found.", 404);
                             return;
                        }

                        $prompt['id'] = (string)$prompt['id'];
                        $prompt['title'] = $prompt['title'] ?? null;
                        $prompt['text'] = $prompt['text'] ?? '';
                        $prompt['promptNote'] = $prompt['promptNote'] ?? null;
                        $prompt['promptSource'] = $prompt['promptSource'] ?? null;
                        $prompt['categoryIds'] = json_decode($prompt['categoryIds'] ?: '[]');
                        $prompt['tags'] = json_decode($prompt['tags'] ?: '[]');
                        $prompt['videoUrl'] = $prompt['videoUrl'] ?: null;
                        $prompt['referenceImageUrl'] = $prompt['referenceImageUrl'] ?: null;
                        $prompt['isPrivate'] = (bool)($prompt['isPrivate'] ?? false);
                        $prompt['isNSFW'] = (bool)($prompt['isNSFW'] ?? false);
                        $prompt['commentsEnabled'] = isset($prompt['commentsEnabled']) ? (bool)$prompt['commentsEnabled'] : true;
                        $prompt['requiresUserImage'] = (bool)($prompt['requiresUserImage'] ?? false);
                        $prompt['rotation'] = (int)($prompt['rotation'] ?? 0);
                        $prompt['authorPhotoURL'] = $prompt['authorPhotoURL'] ?? null; // Ensure this field exists
                        
                        $jsonResponse = json_encode($prompt, JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);
                        if ($redis) {
                            $redis->set($cacheKey, $jsonResponse, ['ex' => 300]);
                        }
                        echo $jsonResponse;
                    } else {
                        send_error("Prompt not found.", 404);
                    }
                    return;
                }

                // List Prompts
                $limit = isset($get_params['limit']) ? intval($get_params['limit']) : 20;
                $page = isset($get_params['page']) ? intval($get_params['page']) : 1;
                $offset = ($page - 1) * $limit;
                $sortBy = $get_params['sortBy'] ?? 'newest';
                
                $where_clauses = [];
                $params = [];
                $types = '';

                $is_admin_view = $is_admin_request && isset($get_params['isAdmin']) && $get_params['isAdmin'] === 'true';

                if (!$is_admin_view) {
                    $where_clauses[] = "(prompts.status = 'approved' OR (prompts.authorId = ? AND prompts.authorId IS NOT NULL))";
                    $params[] = $current_user_uid ?? '';
                    $types .= 's';
                    
                    // Filter Private: Show only if public OR (isPrivate AND isOwner)
                    if ($is_private_column_exists) {
                         $where_clauses[] = "(prompts.isPrivate = 0 OR prompts.isPrivate IS NULL OR (prompts.authorId = ? AND prompts.authorId IS NOT NULL))";
                         $params[] = $current_user_uid ?? '';
                         $types .= 's';
                    }
                }
                
                if (!empty($get_params['searchTerm'])) {
                    $searchTerm = '%' . $get_params['searchTerm'] . '%';
                    $where_clauses[] = "(prompts.text LIKE ? OR prompts.title LIKE ? OR prompts.authorName LIKE ? OR JSON_CONTAINS(prompts.tags, JSON_QUOTE(?), '$'))";
                    array_push($params, $searchTerm, $searchTerm, $searchTerm, $get_params['searchTerm']);
                    $types .= 'ssss';
                }
                
                if (!empty($get_params['category']) && $get_params['category'] !== 'All') {
                    $where_clauses[] = "JSON_CONTAINS(prompts.categoryIds, JSON_QUOTE(?), '$')";
                    $params[] = $get_params['category'];
                    $types .= 's';
                }

                if (!empty($get_params['tag'])) {
                    $where_clauses[] = "JSON_CONTAINS(prompts.tags, JSON_QUOTE(?), '$')";
                    $params[] = $get_params['tag'];
                    $types .= 's';
                }
                
                if (!empty($get_params['author'])) {
                     $where_clauses[] = "prompts.authorId = ?";
                     $params[] = $get_params['author'];
                     $types .= 's';
                }
                
                if (!empty($get_params['date']) && $get_params['date'] !== 'all') {
                    $interval = '';
                    if ($get_params['date'] === '24h') $interval = '1 DAY';
                    if ($get_params['date'] === '7d') $interval = '7 DAY';
                    if ($get_params['date'] === '30d') $interval = '30 DAY';
                    
                    if ($interval) {
                        $where_clauses[] = "prompts.createdAt >= NOW() - INTERVAL $interval";
                    }
                }

                if (isset($get_params['commentFilter']) && $get_params['commentFilter'] !== 'any') {
                     if ($get_params['commentFilter'] === 'yes') {
                         $where_clauses[] = "prompts.commentCount > 0";
                     } else {
                         $where_clauses[] = "(prompts.commentCount = 0 OR prompts.commentCount IS NULL)";
                     }
                }

                if (isset($get_params['remixFilter']) && $get_params['remixFilter'] !== 'any') {
                     if ($get_params['remixFilter'] === 'yes') {
                         $where_clauses[] = "prompts.remixCount > 0";
                     } else {
                         $where_clauses[] = "(prompts.remixCount = 0 OR prompts.remixCount IS NULL)";
                     }
                }

                if (isset($get_params['referenceImageFilter']) && $get_params['referenceImageFilter'] !== 'any') {
                     if ($get_params['referenceImageFilter'] === 'yes') {
                         $where_clauses[] = "(prompts.referenceImageUrl IS NOT NULL AND prompts.referenceImageUrl != '')";
                     } else {
                         $where_clauses[] = "(prompts.referenceImageUrl IS NULL OR prompts.referenceImageUrl = '')";
                     }
                }
                
                if ($is_nsfw_column_exists && isset($get_params['nsfwFilter']) && $get_params['nsfwFilter'] !== 'any') {
                     if ($get_params['nsfwFilter'] === 'yes') {
                         $where_clauses[] = "prompts.isNSFW = 1";
                     } else {
                         // Treat NULL as 0 (Safe)
                         $where_clauses[] = "(prompts.isNSFW = 0 OR prompts.isNSFW IS NULL)";
                     }
                }

                // Join with users table to get fresh authorPhotoURL
                $join_clause = " LEFT JOIN users u ON prompts.authorId = u.uid";
                $select_clause = "prompts.*, u.photoURL as authorPhotoURL";
                $order_by_clause = "";

                // Handle Sorting logic
                if ($sortBy === 'rating') {
                    // Perform LEFT JOIN to sort by average rating
                    $join_clause .= " LEFT JOIN prompt_ratings pr ON prompts.id = pr.promptId";
                    // Sort by calculated average. COALESCE handles prompts with no ratings (0 count).
                    $order_by_clause = " ORDER BY COALESCE(pr.totalScore / NULLIF(pr.count, 0), 0) DESC, prompts.createdAt DESC";
                } else {
                    // Handle NULL values in standard columns by treating them as 0 for sorting
                    $order_by_map = [
                        'oldest' => 'prompts.createdAt ASC',
                        'views' => 'COALESCE(prompts.viewCount, 0) DESC',
                        'comments' => 'COALESCE(prompts.commentCount, 0) DESC',
                        'remixes' => 'COALESCE(prompts.remixCount, 0) DESC',
                        'newest' => 'prompts.createdAt DESC'
                    ];
                    $order_by_clause = " ORDER BY " . ($order_by_map[$sortBy] ?? 'prompts.createdAt DESC');
                }

                $where_sql = count($where_clauses) > 0 ? ' WHERE ' . implode(' AND ', $where_clauses) : '';

                // Count Query
                $total_sql = "SELECT COUNT(prompts.id) as total FROM prompts" . $where_sql;
                $stmt_total = $conn->prepare($total_sql);
                if (!empty($types)) {
                    $stmt_total->bind_param($types, ...$params);
                }
                $stmt_total->execute();
                $total = $stmt_total->get_result()->fetch_assoc()['total'];
                $stmt_total->close();

                // Data Query
                $data_sql = "SELECT $select_clause FROM prompts $join_clause" . $where_sql . $order_by_clause . " LIMIT ? OFFSET ?";
                $stmt_data = $conn->prepare($data_sql);
                
                $data_params = $params;
                $data_types = $types;
                array_push($data_params, $limit, $offset);
                $data_types .= 'ii';

                if (!empty($data_types)) {
                    $stmt_data->bind_param($data_types, ...$data_params);
                } else {
                    $stmt_data->bind_param("ii", $limit, $offset);
                }
                
                $stmt_data->execute();
                $result = $stmt_data->get_result();
                $prompts = [];
                while ($row = $result->fetch_assoc()) {
                    $row['id'] = (string)$row['id'];
                    $row['title'] = $row['title'] ?? null;
                    $row['text'] = $row['text'] ?? '';
                    $row['promptNote'] = $row['promptNote'] ?? null;
                    $row['promptSource'] = $row['promptSource'] ?? null;
                    $row['categoryIds'] = json_decode($row['categoryIds'] ?: '[]');
                    $row['tags'] = json_decode($row['tags'] ?: '[]');
                    $row['videoUrl'] = $row['videoUrl'] ?: null;
                    $row['referenceImageUrl'] = $row['referenceImageUrl'] ?: null;
                    $row['isPrivate'] = (bool)($row['isPrivate'] ?? false);
                    $row['isNSFW'] = (bool)($row['isNSFW'] ?? false);
                    $row['commentsEnabled'] = isset($row['commentsEnabled']) ? (bool)$row['commentsEnabled'] : true;
                    $row['requiresUserImage'] = (bool)($row['requiresUserImage'] ?? false);
                    $row['rotation'] = (int)($row['rotation'] ?? 0);
                    $row['authorPhotoURL'] = $row['authorPhotoURL'] ?? null; // This comes from the JOIN
                    $prompts[] = $row;
                }
                $stmt_data->close();

                // Get all unique tags for filter suggestion (only on page 1)
                $allTags = [];
                if ($page === 1) {
                    $tags_result = $conn->query("SELECT tags FROM prompts");
                    $tag_map = [];
                    while($t_row = $tags_result->fetch_assoc()) {
                         $t_list = json_decode($t_row['tags']);
                         if(is_array($t_list)) {
                             foreach($t_list as $t) {
                                 $t = trim($t);
                                 if($t) $tag_map[$t] = true;
                             }
                         }
                    }
                    $allTags = array_keys($tag_map);
                    sort($allTags);
                }

                $response = [
                    'prompts' => $prompts, 
                    'total' => $total, 
                    'allTags' => $page === 1 ? $allTags : null,
                    'categoryCounts' => null
                ];
                $jsonResponse = json_encode($response, JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);
                if ($redis) {
                    $redis->set($cacheKey, $jsonResponse, ['ex' => 300]);
                }
                echo $jsonResponse;
                break;

            case 'POST':
                clear_prompts_cache($redis);
                
                if (!$current_user_uid) send_error('Authentication required', 401);
                $data = $post_data;

                $conn->begin_transaction();
                try {
                    // Check if it's a remix
                    $remixedFrom = null;
                    if (isset($get_params['action']) && $get_params['action'] === 'remix' && isset($get_params['originalPromptId'])) {
                        $remixedFrom = $get_params['originalPromptId'];
                        // Increment remix count of original
                        $stmt = $conn->prepare("UPDATE prompts SET remixCount = IFNULL(remixCount, 0) + 1 WHERE id = ?");
                        $stmt->bind_param("i", $remixedFrom);
                        $stmt->execute();
                        $stmt->close();
                        
                        // --- NOTIFICATION LOGIC ---
                        $stmt_orig = $conn->prepare("SELECT authorId, text FROM prompts WHERE id = ?");
                        $stmt_orig->bind_param("i", $remixedFrom);
                        $stmt_orig->execute();
                        $orig_prompt = $stmt_orig->get_result()->fetch_assoc();
                        $stmt_orig->close();

                        if ($orig_prompt && !empty($orig_prompt['authorId']) && $orig_prompt['authorId'] !== $current_user_uid) {
                            $stmt_actor = $conn->prepare("SELECT username, photoURL FROM users WHERE uid = ?");
                            $stmt_actor->bind_param("s", $current_user_uid);
                            $stmt_actor->execute();
                            $actor = $stmt_actor->get_result()->fetch_assoc();
                            $stmt_actor->close();

                            $notif_stmt = $conn->prepare("INSERT INTO notifications (recipientId, actorId, actorName, actorPhotoURL, type, promptId, promptText, is_read, createdAt) VALUES (?, ?, ?, ?, 'remix', ?, ?, 0, NOW())");
                            $prompt_text_snippet = mb_substr($orig_prompt['text'], 0, 50);
                            $actorPhotoURL = $actor['photoURL'] ?? null;
                            $actorName = $actor['username'] ?? 'Unknown';
                            
                            $notif_stmt->bind_param(
                                "ssssis",
                                $orig_prompt['authorId'],
                                $current_user_uid,
                                $actorName,
                                $actorPhotoURL,
                                $remixedFrom,
                                $prompt_text_snippet
                            );
                            $notif_stmt->execute();
                            $notif_stmt->close();

                            $conn->query("UPDATE users SET points = IFNULL(points, 0) + 5 WHERE uid = '{$orig_prompt['authorId']}'");
                        }
                    }

                    // SECURITY FIX: Sanitize array elements before JSON encoding
                    $raw_categoryIds = $data['categoryIds'] ?? [];
                    $safe_categoryIds = array_map(function($id) { return htmlspecialchars($id, ENT_QUOTES, 'UTF-8'); }, $raw_categoryIds);
                    $categoryIds = json_encode($safe_categoryIds);

                    $raw_tags = $data['tags'] ?? [];
                    $safe_tags = array_map(function($tag) { return htmlspecialchars($tag, ENT_QUOTES, 'UTF-8'); }, $raw_tags);
                    $tags = json_encode($safe_tags);
                    
                    $sql_columns = "title, text, imageUrl, videoUrl, categoryIds, tags, authorId, authorName, remixedFrom, commentsEnabled, referenceImageUrl, requiresUserImage, rotation";
                    $sql_placeholders = "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?";
                    $types = "sssssssssisii";
                    
                    // SECURITY: Enforce authorId to be the current user unless admin
                    $authorId = $current_user_uid;
                    // Fetch username to ensure consistency
                    $user_stmt = $conn->prepare("SELECT username FROM users WHERE uid = ?");
                    $user_stmt->bind_param("s", $authorId);
                    $user_stmt->execute();
                    $user_res = $user_stmt->get_result()->fetch_assoc();
                    $authorName = $user_res['username'] ?? 'Unknown';
                    $user_stmt->close();

                    // Sanitize text inputs
                    $sanitized_title = htmlspecialchars($data['title'] ?? '', ENT_QUOTES, 'UTF-8');
                    $sanitized_text = htmlspecialchars($data['text'] ?? '', ENT_QUOTES, 'UTF-8');

                    $params = [
                        $sanitized_title, $sanitized_text, $data['imageUrl'], $data['videoUrl'] ?? null, 
                        $categoryIds, $tags, $authorId, $authorName, $remixedFrom, 
                        isset($data['commentsEnabled']) ? (int)$data['commentsEnabled'] : 1, $data['referenceImageUrl'] ?? null, isset($data['requiresUserImage']) ? (int)$data['requiresUserImage'] : 0,
                        isset($data['rotation']) ? (int)$data['rotation'] : 0
                    ];
                    
                    if ($is_private_column_exists) {
                        $sql_columns .= ", isPrivate";
                        $sql_placeholders .= ", ?";
                        $types .= "i";
                        $params[] = isset($data['isPrivate']) ? (int)$data['isPrivate'] : 0;
                    }

                    if ($is_nsfw_column_exists) {
                        $sql_columns .= ", isNSFW";
                        $sql_placeholders .= ", ?";
                        $types .= "i";
                        $params[] = isset($data['isNSFW']) ? (int)$data['isNSFW'] : 0;
                    }
                    
                    if ($is_status_column_exists) {
                        $sql_columns .= ", status";
                        $sql_placeholders .= ", ?";
                        $types .= "s";
                        $status = $is_admin_request ? ($data['status'] ?? 'approved') : 'pending';
                        $params[] = $status;
                    }

                    if ($is_prompt_note_exists) {
                        $sql_columns .= ", promptNote";
                        $sql_placeholders .= ", ?";
                        $types .= "s";
                        $params[] = isset($data['promptNote']) ? htmlspecialchars($data['promptNote'], ENT_QUOTES, 'UTF-8') : null;
                    }

                    if ($is_prompt_source_exists) {
                        $sql_columns .= ", promptSource";
                        $sql_placeholders .= ", ?";
                        $types .= "s";
                        $val = isset($data['promptSource']) ? htmlspecialchars($data['promptSource'], ENT_QUOTES, 'UTF-8') : null;
                        if ($val === '') $val = null;
                        $params[] = $val;
                    }

                    $stmt = $conn->prepare("INSERT INTO prompts ($sql_columns) VALUES ($sql_placeholders)");
                    $stmt->bind_param($types, ...$params);
                    $stmt->execute();
                    $newId = $stmt->insert_id;
                    
                    $conn->commit();

                    // SYNC CATEGORIES
                    sync_categories_data($redis, $conn);
                    
                    $res_stmt = $conn->prepare("SELECT * FROM prompts WHERE id=?");
                    $res_stmt->bind_param("i", $newId);
                    $res_stmt->execute();
                    $res = $res_stmt->get_result()->fetch_assoc();
                    $res['id'] = (string)$res['id'];
                    $res['title'] = $res['title'] ?? null;
                    $res['text'] = $res['text'] ?? '';
                    $res['promptNote'] = $res['promptNote'] ?? null;
                    $res['promptSource'] = $res['promptSource'] ?? null;
                    $res['categoryIds'] = json_decode($res['categoryIds']);
                    $res['tags'] = json_decode($res['tags']);
                    $res['isPrivate'] = (bool)($res['isPrivate'] ?? false);
                    $res['isNSFW'] = (bool)($res['isNSFW'] ?? false);
                    send_json($res);

                } catch (Exception $e) {
                    $conn->rollback();
                    throw $e;
                }
                break;

            case 'PUT':
                clear_prompts_cache($redis);
                if (!$id) send_error('Missing ID for PUT request', 400);
                if (!$current_user_uid) send_error('Authentication required', 401);
                
                $data = $post_data;

                // SECURITY FIX: Sanitize array elements
                $raw_categoryIds = $data['categoryIds'] ?? [];
                $safe_categoryIds = array_map(function($id) { return htmlspecialchars($id, ENT_QUOTES, 'UTF-8'); }, $raw_categoryIds);
                $categoryIds = json_encode($safe_categoryIds);

                $raw_tags = $data['tags'] ?? [];
                $safe_tags = array_map(function($tag) { return htmlspecialchars($tag, ENT_QUOTES, 'UTF-8'); }, $raw_tags);
                $tags = json_encode($safe_tags);
                
                // SECURITY: Check ownership
                $check_stmt = $conn->prepare("SELECT authorId, status FROM prompts WHERE id = ?");
                $check_stmt->bind_param("i", $id);
                $check_stmt->execute();
                $old_prompt = $check_stmt->get_result()->fetch_assoc();
                $check_stmt->close();
                
                if (!$old_prompt) send_error('Prompt not found', 404);
                if (!$is_admin_request && $old_prompt['authorId'] !== $current_user_uid) {
                    send_error('Forbidden: You do not own this prompt', 403);
                }
                
                // Sanitize
                $sanitized_title = htmlspecialchars($data['title'] ?? '', ENT_QUOTES, 'UTF-8');
                $sanitized_text = htmlspecialchars($data['text'] ?? '', ENT_QUOTES, 'UTF-8');

                $sql_fields_arr = ["title=?", "text=?", "imageUrl=?", "videoUrl=?", "categoryIds=?", "tags=?", "commentsEnabled=?", "referenceImageUrl=?", "requiresUserImage=?", "rotation=?"];
                $types = "ssssssisii";
                $params = [
                    $sanitized_title, $sanitized_text, $data['imageUrl'], $data['videoUrl'] ?? null, 
                    $categoryIds, $tags, 
                    isset($data['commentsEnabled']) ? (int)$data['commentsEnabled'] : 1, $data['referenceImageUrl'] ?? null, isset($data['requiresUserImage']) ? (int)$data['requiresUserImage'] : 0,
                    isset($data['rotation']) ? (int)$data['rotation'] : 0
                ];
                
                if ($is_admin_request && isset($data['authorId'])) {
                    $sql_fields_arr[] = "authorId=?";
                    $sql_fields_arr[] = "authorName=?";
                    $types .= "ss";
                    $params[] = $data['authorId'];
                    $params[] = $data['authorName'];
                }

                if ($is_private_column_exists) {
                    $sql_fields_arr[] = "isPrivate=?";
                    $types .= "i";
                    $params[] = isset($data['isPrivate']) ? (int)$data['isPrivate'] : 0;
                }

                if ($is_nsfw_column_exists) {
                    $sql_fields_arr[] = "isNSFW=?";
                    $types .= "i";
                    $params[] = isset($data['isNSFW']) ? (int)$data['isNSFW'] : 0;
                }
                
                if ($is_prompt_note_exists) {
                    $sql_fields_arr[] = "promptNote=?";
                    $types .= "s";
                    $params[] = isset($data['promptNote']) ? htmlspecialchars($data['promptNote'], ENT_QUOTES, 'UTF-8') : null;
                }

                if ($is_prompt_source_exists) {
                    $sql_fields_arr[] = "promptSource=?";
                    $types .= "s";
                    $val = isset($data['promptSource']) ? htmlspecialchars($data['promptSource'], ENT_QUOTES, 'UTF-8') : null;
                    if ($val === '') $val = null;
                    $params[] = $val;
                }

                if ($is_admin_request && isset($data['status'])) {
                    $old_status = $old_prompt['status'] ?? 'approved';
                    $new_status = $data['status'];
                    
                    if ($new_status !== $old_status) {
                         $sql_fields_arr[] = "status=?";
                         $types .= "s";
                         $params[] = $new_status;
                         // Notifications omitted
                    }
                } elseif (!$is_admin_request) {
                    $sql_fields_arr[] = "status='pending'";
                }
                
                $sql_fields = implode(', ', $sql_fields_arr);
                $stmt = $conn->prepare("UPDATE prompts SET $sql_fields WHERE id=?");
                $types .= "i";
                $params[] = $id;
                $stmt->bind_param($types, ...$params);
                $stmt->execute();

                // SYNC CATEGORIES
                sync_categories_data($redis, $conn);
                
                $res_stmt = $conn->prepare("SELECT * FROM prompts WHERE id=?");
                $res_stmt->bind_param("i", $id);
                $res_stmt->execute();
                $res = $res_stmt->get_result()->fetch_assoc();
                $res['id'] = (string)$res['id'];
                $res['title'] = $res['title'] ?? null;
                $res['text'] = $res['text'] ?? '';
                $res['promptNote'] = $res['promptNote'] ?? null;
                $res['promptSource'] = $res['promptSource'] ?? null;
                $res['categoryIds'] = json_decode($res['categoryIds']);
                $res['tags'] = json_decode($res['tags']);
                $res['isPrivate'] = (bool)($res['isPrivate'] ?? false);
                $res['isNSFW'] = (bool)($res['isNSFW'] ?? false);
                send_json($res);
                break;

            case 'DELETE':
                clear_prompts_cache($redis);
                if (!$id) send_error('Missing ID for DELETE request', 400);
                if (!$current_user_uid) send_error('Authentication required', 401);

                $stmt_check = $conn->prepare("SELECT authorId FROM prompts WHERE id = ?");
                $stmt_check->bind_param("i", $id);
                $stmt_check->execute();
                $prompt_to_delete = $stmt_check->get_result()->fetch_assoc();
                $stmt_check->close();

                if (!$prompt_to_delete) send_error('Prompt not found', 404);
                
                if (!$is_admin_request && $current_user_uid !== $prompt_to_delete['authorId']) {
                    send_error('Forbidden: You do not own this prompt', 403);
                }

                $stmt = $conn->prepare("DELETE FROM prompts WHERE id = ?");
                $stmt->bind_param("i", $id);
                $stmt->execute();

                // SYNC CATEGORIES
                sync_categories_data($redis, $conn);

                send_json(['id' => (string)$id]);
                break;

            default:
                send_error('Method not allowed', 405);
                break;
        }
    } catch (Exception $e) {
        if (isset($conn) && $conn->in_transaction) $conn->rollback();
        send_error("Database error in prompts handler: " . $e->getMessage(), 500);
    }
}
?>