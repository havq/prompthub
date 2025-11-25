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

function handle_reports($conn, $method, $id, $get_params, $post_data) {
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    try {
        switch($method) {
            case 'GET':
                $result = $conn->query("SELECT * FROM reports ORDER BY createdAt DESC");
                send_json($result->fetch_all(MYSQLI_ASSOC));
                break;
            case 'POST':
                $data = $post_data;
                $stmt = $conn->prepare("INSERT INTO reports (promptId, promptText, reason, details, userId, username) VALUES (?, ?, ?, ?, ?, ?)");
                $details = isset($data['details']) ? strip_all_tags_pure($data['details']) : null;
                $userId = $data['userId'] ?? null;
                $username = $data['username'] ?? null;
                $stmt->bind_param("isssss", $data['promptId'], $data['promptText'], $data['reason'], $details, $userId, $username);
                $stmt->execute();
                $newId = $stmt->insert_id;
                $res_stmt = $conn->prepare("SELECT * FROM reports WHERE id=?");
                $res_stmt->bind_param("i", $newId);
                $res_stmt->execute();
                send_json($res_stmt->get_result()->fetch_assoc());
                break;
            case 'PUT':
                if (!$id) send_error('Missing ID for PUT request', 400);
                $data = $post_data;
                $stmt = $conn->prepare("UPDATE reports SET status=? WHERE id=?");
                $stmt->bind_param("si", $data['status'], $id);
                $stmt->execute();
                send_json($data);
                break;
            case 'DELETE':
                if (!$id) send_error('Missing ID for DELETE request', 400);
                $stmt = $conn->prepare("DELETE FROM reports WHERE id=?");
                $stmt->bind_param("i", $id);
                $stmt->execute();
                send_json(['id' => $id]);
                break;
            default:
                send_error('Method not allowed', 405);
                break;
        }
    } catch (Exception $e) {
        send_error("Database error in reports handler: " . $e->getMessage(), 500);
    }
}
?>