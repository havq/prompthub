<?php
function clear_categories_cache($redis) {
    if (!$redis) return;
    $keys = $redis->keys('categories:*');
    if ($keys && count($keys) > 0) {
        $redis->del($keys);
    }
}

// --- SOLUTION A: Denormalization Helper ---
// Tính toán lại số lượng prompt cho từng category và lưu vào DB.
// Hàm này được gọi khi có thay đổi về dữ liệu (Write) để giảm tải cho việc Đọc (Read).
function update_all_category_counts($conn) {
    // 1. Kiểm tra xem cột promptCount có tồn tại không để tránh lỗi nếu chưa chạy migration
    $col_check = $conn->query("SHOW COLUMNS FROM `categories` LIKE 'promptCount'");
    if ($col_check->num_rows === 0) {
        return false; // Cột chưa tồn tại, quay về phương pháp cũ
    }

    // 2. Tính toán số lượng từ bảng prompts (chỉ đếm prompt đã duyệt và công khai)
    $counts = [];
    $prompts_result = $conn->query("SELECT categoryIds FROM prompts WHERE status = 'approved' AND isPrivate = 0");
    if ($prompts_result) {
        while($row = $prompts_result->fetch_assoc()) {
            $decoded_ids = json_decode($row['categoryIds']);
            if (is_array($decoded_ids)) {
                foreach ($decoded_ids as $cat_id) {
                    $counts[$cat_id] = ($counts[$cat_id] ?? 0) + 1;
                }
            }
        }
    }

    // 3. Cập nhật vào bảng categories
    // Reset tất cả về 0 trước hoặc update từng dòng. Để an toàn và đơn giản, ta update từng dòng.
    $cats_res = $conn->query("SELECT id FROM categories");
    if ($cats_res) {
        while($cat = $cats_res->fetch_assoc()) {
            $count = $counts[$cat['id']] ?? 0;
            // Sử dụng query trực tiếp để update
            $conn->query("UPDATE categories SET promptCount = {$count} WHERE id = '{$cat['id']}'");
        }
    }
    return true;
}

function handle_categories($conn, $method, $id, $get_params, $post_data) {
    global $redis;
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    try {
        switch($method) {
            case 'GET':
                $cacheKey = 'categories:' . md5(http_build_query($get_params));
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

                $sql = "SELECT * FROM categories ORDER BY name ASC";
                $result = $conn->query($sql);
                $categories = $result->fetch_all(MYSQLI_ASSOC);
                
                // Convert ID types
                foreach ($categories as &$cat) {
                    $cat['id'] = (string)$cat['id'];
                    $cat['parentId'] = !empty($cat['parentId']) ? (string)$cat['parentId'] : null;
                }

                if ($with_counts) {
                    // Kiểm tra xem cột promptCount có sẵn trong dữ liệu lấy ra không
                    $hasStoredCount = isset($categories[0]) && array_key_exists('promptCount', $categories[0]);

                    if ($hasStoredCount) {
                        // Cách A: Sử dụng dữ liệu đã lưu trong DB (Siêu nhanh)
                        // Ép kiểu về số nguyên
                        foreach ($categories as &$category) {
                            $category['promptCount'] = (int)$category['promptCount'];
                        }
                    } else {
                        // Fallback: Nếu chưa chạy lệnh SQL thêm cột, dùng cách tính toán thủ công (Cách cũ)
                        $counts = [];
                        $prompts_result = $conn->query("SELECT categoryIds FROM prompts WHERE status='approved' AND isPrivate=0");
                        while($row = $prompts_result->fetch_assoc()) {
                            $decoded_ids = json_decode($row['categoryIds']);
                            if (is_array($decoded_ids)) {
                                foreach ($decoded_ids as $cat_id) {
                                    $counts[$cat_id] = ($counts[$cat_id] ?? 0) + 1;
                                }
                            }
                        }
                        foreach ($categories as &$category) {
                            $category['promptCount'] = $counts[$category['id']] ?? 0;
                        }
                    }
                }
                
                $jsonResponse = json_encode($categories, JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);
                if ($redis) {
                    $redis->set($cacheKey, $jsonResponse, ['ex' => 300]);
                }
                echo $jsonResponse;
                break;
            case 'POST':
                clear_categories_cache($redis);
                $data = $post_data;
                if (empty($data['name'])) send_error('Category name cannot be empty.', 400);
                
                $check_col = $conn->query("SHOW COLUMNS FROM `categories` LIKE 'parentId'");
                if ($check_col->num_rows > 0) {
                    $parentId = !empty($data['parentId']) ? (int)$data['parentId'] : null;
                    $stmt = $conn->prepare("INSERT INTO categories (name, parentId) VALUES (?, ?)");
                    $stmt->bind_param("si", $data['name'], $parentId);
                } else {
                    $stmt = $conn->prepare("INSERT INTO categories (name) VALUES (?)");
                    $stmt->bind_param("s", $data['name']);
                }
                
                $stmt->execute();
                $newId = $stmt->insert_id;
                
                // Update counts (in case logic depends on empty cats having 0)
                update_all_category_counts($conn);

                send_json(['id' => $newId, 'name' => $data['name'], 'parentId' => $data['parentId'] ?? null]);
                break;
            case 'PUT':
                clear_categories_cache($redis);
                if (!$id) send_error('Missing ID for PUT request', 400);
                $data = $post_data;
                if (empty($data['name'])) send_error('Category name cannot be empty.', 400);
                
                $check_col = $conn->query("SHOW COLUMNS FROM `categories` LIKE 'parentId'");
                if ($check_col->num_rows > 0) {
                    $parentId = !empty($data['parentId']) ? (int)$data['parentId'] : null;
                    if ($parentId == $id) $parentId = null;
                    
                    $stmt = $conn->prepare("UPDATE categories SET name=?, parentId=? WHERE id=?");
                    $stmt->bind_param("sii", $data['name'], $parentId, $id);
                } else {
                    $stmt = $conn->prepare("UPDATE categories SET name=? WHERE id=?");
                    $stmt->bind_param("si", $data['name'], $id);
                }

                $stmt->execute();
                send_json($data);
                break;
            case 'DELETE':
                clear_categories_cache($redis);
                if (!$id) send_error('Missing ID for DELETE request', 400);
                $stmt = $conn->prepare("DELETE FROM categories WHERE id=?");
                $stmt->bind_param("i", $id);
                $stmt->execute();
                
                update_all_category_counts($conn);
                
                send_json(['id' => $id]);
                break;
            default:
                send_error('Method not allowed', 405);
                break;
        }
    } catch (Exception $e) {
        send_error("Database error in categories handler: " . $e->getMessage(), 500);
    }
}
?>