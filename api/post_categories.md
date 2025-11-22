<?php
function clear_post_categories_cache($redis) {
    if (!$redis) return;
    $keys = $redis->keys('post_categories:*');
    if ($keys && count($keys) > 0) {
        $redis->del($keys);
    }
}

function handle_post_categories($conn, $method, $id, $get_params, $post_data) {
    global $is_admin_request, $redis;
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    try {
        switch($method) {
            case 'GET':
                $cacheKey = 'post_categories:' . md5(http_build_query($get_params));
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

                $with_counts = isset($get_params['counts']) && $get_params['counts'] === 'true';

                $sql = "SELECT * FROM post_categories ORDER BY name ASC";
                $result = $conn->query($sql);
                $categories = $result->fetch_all(MYSQLI_ASSOC);

                // Convert parentId to string for consistency
                foreach ($categories as &$cat) {
                    $cat['id'] = (string)$cat['id'];
                    $cat['parentId'] = !empty($cat['parentId']) ? (string)$cat['parentId'] : null;
                }

                if ($with_counts) {
                    $counts = [];

                    $is_status_column_exists = $conn->query("SHOW COLUMNS FROM `posts` LIKE 'status'")->num_rows > 0;
                    $is_admin_view_meta = $is_admin_request && isset($get_params['isAdmin']) && $get_params['isAdmin'] === 'true';
                    
                    $where_sql = "WHERE categoryIds IS NOT NULL AND categoryIds != '[]' AND categoryIds != ''";
                    
                    if ($is_status_column_exists && !$is_admin_view_meta) {
                        $where_sql .= " AND status = 'published'";
                    }

                    $posts_result = $conn->query("SELECT categoryIds FROM posts " . $where_sql);

                    while($row = $posts_result->fetch_assoc()) {
                        $decoded_ids = json_decode($row['categoryIds']);
                        if (is_array($decoded_ids)) {
                            foreach ($decoded_ids as $cat_id) {
                                $counts[$cat_id] = ($counts[$cat_id] ?? 0) + 1;
                            }
                        }
                    }
                    foreach ($categories as &$category) {
                        $category['postCount'] = $counts[$category['id']] ?? 0;
                    }
                    unset($category);
                }
                
                $jsonResponse = json_encode($categories, JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);
                if ($redis) {
                    $redis->set($cacheKey, $jsonResponse, ['ex' => 300]);
                }
                echo $jsonResponse;
                break;
            case 'POST':
                clear_post_categories_cache($redis);
                $data = $post_data;
                if (empty($data['name'])) send_error('Category name cannot be empty.', 400);
                
                // Check if parentId column exists
                $check_col = $conn->query("SHOW COLUMNS FROM `post_categories` LIKE 'parentId'");
                if ($check_col->num_rows > 0) {
                    $parentId = !empty($data['parentId']) ? (int)$data['parentId'] : null;
                    $stmt = $conn->prepare("INSERT INTO post_categories (name, parentId) VALUES (?, ?)");
                    $stmt->bind_param("si", $data['name'], $parentId);
                } else {
                    $stmt = $conn->prepare("INSERT INTO post_categories (name) VALUES (?)");
                    $stmt->bind_param("s", $data['name']);
                }
                
                $stmt->execute();
                $newId = $stmt->insert_id;
                send_json(['id' => $newId, 'name' => $data['name'], 'parentId' => $data['parentId'] ?? null]);
                break;
            case 'PUT':
                clear_post_categories_cache($redis);
                if (!$id) send_error('Missing ID for PUT request', 400);
                $data = $post_data;
                if (empty($data['name'])) send_error('Category name cannot be empty.', 400);
                
                 // Check if parentId column exists
                $check_col = $conn->query("SHOW COLUMNS FROM `post_categories` LIKE 'parentId'");
                if ($check_col->num_rows > 0) {
                    $parentId = !empty($data['parentId']) ? (int)$data['parentId'] : null;
                    if ($parentId == $id) $parentId = null; // Prevent self-parenting

                    $stmt = $conn->prepare("UPDATE post_categories SET name=?, parentId=? WHERE id=?");
                    $stmt->bind_param("sii", $data['name'], $parentId, $id);
                } else {
                    $stmt = $conn->prepare("UPDATE post_categories SET name=? WHERE id=?");
                    $stmt->bind_param("si", $data['name'], $id);
                }

                $stmt->execute();
                send_json($data);
                break;
            case 'DELETE':
                clear_post_categories_cache($redis);
                if (!$id) send_error('Missing ID for DELETE request', 400);
                $stmt = $conn->prepare("DELETE FROM post_categories WHERE id=?");
                $stmt->bind_param("i", $id);
                $stmt->execute();
                send_json(['id' => $id]);
                break;
            default:
                send_error('Method not allowed', 405);
                break;
        }
    } catch (Exception $e) {
        send_error("Database error in post_categories handler: " . $e->getMessage(), 500);
    }
}
