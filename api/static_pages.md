
<?php
function clear_static_pages_cache($redis) {
    if (!$redis) return;
    $redis->del('static_pages:all');
}

function handle_static_pages($conn, $method, $id, $get_params, $post_data) {
    global $redis;
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    try {
        switch($method) {
            case 'GET':
                $cacheKey = 'static_pages:all';
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

                $result = $conn->query("SELECT * FROM static_pages ORDER BY title ASC");
                $pages = $result->fetch_all(MYSQLI_ASSOC);
                
                $jsonResponse = json_encode($pages, JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);
                if ($redis) {
                    $redis->set($cacheKey, $jsonResponse, ['ex' => 3600]); // Cache for 1 hour
                }
                echo $jsonResponse;
                break;
            case 'POST':
                clear_static_pages_cache($redis);
                $data = $post_data;
                
                // Sanitize HTML content
                $allowed_tags = '<p><a><b><i><u><ul><ol><li><blockquote><h1><h2><h3><h4><h5><h6><br><img><video><div><span>';
                $sanitized_content = strip_tags($data['content'], $allowed_tags);

                $stmt = $conn->prepare("INSERT INTO static_pages (title, slug, content) VALUES (?, ?, ?)");
                $stmt->bind_param("sss", $data['title'], $data['slug'], $sanitized_content);
                $stmt->execute();
                $newId = $stmt->insert_id;
                $res_stmt = $conn->prepare("SELECT * FROM static_pages WHERE id=?");
                $res_stmt->bind_param("i", $newId);
                $res_stmt->execute();
                send_json($res_stmt->get_result()->fetch_assoc());
                break;
            case 'PUT':
                clear_static_pages_cache($redis);
                if (!$id) send_error('Missing ID for PUT request', 400);
                $data = $post_data;
                
                // Sanitize HTML content
                $allowed_tags = '<p><a><b><i><u><ul><ol><li><blockquote><h1><h2><h3><h4><h5><h6><br><img><video><div><span>';
                $sanitized_content = strip_tags($data['content'], $allowed_tags);

                $stmt = $conn->prepare("UPDATE static_pages SET title=?, slug=?, content=?, updatedAt=NOW() WHERE id=?");
                $stmt->bind_param("sssi", $data['title'], $data['slug'], $sanitized_content, $id);
                $stmt->execute();
                send_json($data);
                break;
            case 'DELETE':
                clear_static_pages_cache($redis);
                if (!$id) send_error('Missing ID for DELETE request', 400);
                $stmt = $conn->prepare("DELETE FROM static_pages WHERE id=?");
                $stmt->bind_param("i", $id);
                $stmt->execute();
                send_json(['id' => $id]);
                break;
            default:
                send_error('Method not allowed', 405);
                break;
        }
    } catch (Exception $e) {
        send_error("Database error in static_pages handler: " . $e->getMessage(), 500);
    }
}
?>
