<?php

/**
 * Hàm xử lý API cho các thông báo (notifications).
 *
 * @param mysqli $conn Kết nối cơ sở dữ liệu MySQLi.
 * @param string $method Phương thức HTTP (GET, POST, DELETE).
 * @param int|null $id ID của thông báo (chỉ dùng cho POST/PUT/DELETE khi thao tác với một thông báo cụ thể).
 * @param array $get_params Dữ liệu từ tham số truy vấn GET.
 * @param array $post_data Dữ liệu từ body POST (dự kiến là JSON đã được decode).
 * @return void
 */
function handle_notifications($conn, $method, $id, $get_params, $post_data) {
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    global $current_user_uid, $is_admin_request; // Lấy UID từ auth middleware
    
    try {
        switch($method) {
            case 'GET':
                $recipientId = $get_params['recipientId'] ?? $current_user_uid;
                if (empty($recipientId)) {
                    send_error('Authentication is required to fetch notifications.', 401);
                    return;
                }

                // Security check: A user can only fetch their own notifications. Admins can fetch any.
                if ($recipientId !== $current_user_uid && !$is_admin_request) {
                    send_error('Forbidden: You can only access your own notifications.', 403);
                    return;
                }

                // --- START: Tự động xóa thông báo cũ ---
                // Chỉ chạy dọn dẹp cho người dùng đang yêu cầu thông báo của chính họ
                if ($recipientId === $current_user_uid) {
                    try {
                        // Xóa thông báo có giá trị thấp sau 60 ngày
                        $stmt_low_value = $conn->prepare("
                            DELETE FROM notifications 
                            WHERE recipientId = ? 
                            AND type IN ('favorite', 'rating', 'comment-like') 
                            AND createdAt < NOW() - INTERVAL 60 DAY
                        ");
                        $stmt_low_value->bind_param("s", $recipientId);
                        $stmt_low_value->execute();
                        $stmt_low_value->close();

                        // Xóa thông báo tương tác sau 180 ngày
                        $stmt_interactive = $conn->prepare("
                            DELETE FROM notifications 
                            WHERE recipientId = ? 
                            AND type IN ('follow', 'collection', 'remix', 'comment', 'showcase', 'comment-reply', 'comment-mention') 
                            AND createdAt < NOW() - INTERVAL 180 DAY
                        ");
                        $stmt_interactive->bind_param("s", $recipientId);
                        $stmt_interactive->execute();
                        $stmt_interactive->close();
                    } catch (Exception $e) {
                        // Ghi lại lỗi nhưng không làm gián đoạn việc lấy thông báo
                        error_log("Failed to prune old notifications for user {$recipientId}: " . $e->getMessage());
                    }
                }
                // --- END: Tự động xóa thông báo cũ ---

                $stmt = $conn->prepare("SELECT n.*, u.photoURL as liveActorPhotoURL FROM notifications n LEFT JOIN users u ON n.actorId = u.uid WHERE n.recipientId = ? ORDER BY n.createdAt DESC LIMIT 50");
                $stmt->bind_param("s", $recipientId);
                $stmt->execute();
                $result = $stmt->get_result();
                
                $notifications = [];
                while ($row = $result->fetch_assoc()) {
                    $row['is_read'] = (bool)$row['is_read'];
                    if (in_array($row['type'], ['comment-reply', 'comment-like', 'comment-mention'])) {
                        $row['reelId'] = $row['promptId'];
                    }
                    $row['commentId'] = isset($row['commentId']) ? (string)$row['commentId'] : null;
                    if (isset($row['liveActorPhotoURL'])) {
                        $row['actorPhotoURL'] = $row['liveActorPhotoURL'];
                    }
                    unset($row['liveActorPhotoURL']);
                    $notifications[] = $row;
                }
                send_json($notifications);
                break;

            case 'POST':
                if (!$current_user_uid) { send_error('Authentication required.', 401); return; }
                $data = $post_data;

                // 1. Mark a single notification as read
                if ($id && isset($data['is_read']) && $data['is_read'] === true) {
                    $recipientId = $data['recipientId'] ?? null;
                    if (!$recipientId) { send_error('recipientId is required in request body.', 400); return; }
                    if ($recipientId !== $current_user_uid && !$is_admin_request) { send_error('Forbidden: You can only modify your own notifications.', 403); return; }

                    $stmt = $conn->prepare("UPDATE notifications SET `is_read` = 1 WHERE id = ? AND recipientId = ?");
                    $stmt->bind_param("is", $id, $recipientId);
                    $stmt->execute();
                    send_json(['status' => 'ok', 'message' => 'Notification marked as read.']);
                
                // 2. Mark all notifications as read
                } else if (isset($data['readAll']) && $data['readAll'] === true) {
                    $recipientId = $get_params['recipientId'] ?? null;
                    if (!$recipientId) { send_error('recipientId is required in query params.', 400); return; }
                    if ($recipientId !== $current_user_uid && !$is_admin_request) { send_error('Forbidden: You can only modify your own notifications.', 403); return; }

                    $stmt = $conn->prepare("UPDATE notifications SET `is_read` = 1 WHERE recipientId = ? AND `is_read` = 0");
                    $stmt->bind_param("s", $recipientId);
                    $stmt->execute();
                    send_json(['status' => 'ok', 'message' => 'All notifications marked as read.']);
                
                // 3. Create a new notification
                } else if (!empty($data['recipientId']) && !empty($data['type'])) {
                    // Initialize all possible variables, using ?? null for safety.
                    $recipientId = $data['recipientId'] ?? null;
                    $type = $data['type'] ?? null;
                    $actorId = $data['actorId'] ?? null;
                    $actorName = $data['actorName'] ?? null;
                    $actorPhotoURL = $data['actorPhotoURL'] ?? null;
                    $promptId = isset($data['promptId']) ? (int)$data['promptId'] : null;
                    $commentId = isset($data['commentId']) ? (int)$data['commentId'] : null;
                    $promptText = $data['promptText'] ?? null;
                    $commentText = $data['commentText'] ?? null;
                    $collectionName = $data['collectionName'] ?? null;
                    $badgeName = $data['badgeName'] ?? null;
                    $rating_value = isset($data['ratingValue']) ? (float)$data['ratingValue'] : null;
                    $read_val = (isset($data['is_read']) && $data['is_read']) || (isset($data['read']) && $data['read'] === true) ? 1 : 0;
                    $reelId = isset($data['reelId']) ? (int)$data['reelId'] : null;
                    
                    $sql = "INSERT INTO notifications (recipientId, actorId, actorName, actorPhotoURL, type, promptId, reelId, commentId, promptText, commentText, collectionName, badgeName, is_read, rating_value) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                    $stmt = $conn->prepare($sql);
                    
                    $stmt->bind_param("sssssiiissssid", 
                        $recipientId, 
                        $actorId, 
                        $actorName, 
                        $actorPhotoURL, 
                        $type, 
                        $promptId,
                        $reelId, 
                        $commentId, 
                        $promptText, 
                        $commentText, 
                        $collectionName, 
                        $badgeName, 
                        $read_val, 
                        $rating_value
                    );
                    
                    $stmt->execute();
                    $newId = $stmt->insert_id;
                    send_json(['id' => $newId, 'status' => 'success', 'message' => 'Notification created successfully.']);

                // 4. Fallback for invalid POST request
                } else {
                    send_error('Invalid POST request for notifications. Missing parameters.', 400);
                }
                break;

            case 'DELETE':
                if (!$current_user_uid) { send_error('Authentication required.', 401); return; }
                $recipientId = $get_params['recipientId'] ?? null;
                if (!$recipientId) { send_error('recipientId is required for DELETE operations.', 400); return; }
                
                if ($recipientId !== $current_user_uid && !$is_admin_request) {
                    send_error('Forbidden: You can only delete your own notifications.', 403);
                    return;
                }

                // Logic để xóa TẤT CẢ thông báo của một người dùng
                if (isset($get_params['action']) && $get_params['action'] === 'deleteAll') {
                    $stmt = $conn->prepare("DELETE FROM notifications WHERE recipientId = ?");
                    $stmt->bind_param("s", $recipientId);
                    $stmt->execute();
                    send_json(['status' => 'ok', 'message' => 'All notifications deleted successfully.']);
                    return;
                }

                // Logic để xóa MỘT thông báo cụ thể
                $notificationId = $id ?? $get_params['id'] ?? null;
                if (!$notificationId) {
                    send_error('Notification ID is required to delete a single notification.', 400);
                    return;
                }
                
                $stmt = $conn->prepare("DELETE FROM notifications WHERE id = ? AND recipientId = ?");
                $stmt->bind_param("is", $notificationId, $recipientId);
                $stmt->execute();

                if ($stmt->affected_rows > 0) {
                    send_json(['status' => 'ok', 'message' => 'Notification deleted successfully.', 'id' => $notificationId]);
                } else {
                    send_error('Notification not found or permission denied.', 404);
                }
                break;

            default:
                send_error('Method not allowed', 405);
                break;
        }
    } catch (Exception $e) {
        send_error("Database error in notifications handler: " . $e->getMessage(), 500);
    }
}
?>