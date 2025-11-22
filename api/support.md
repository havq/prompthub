<?php
function notify_admins_support($conn, $type, $ticketId, $snippet, $actorId, $actorName, $actorPhotoURL) {
    // Get all admins
    $stmt = $conn->prepare("SELECT uid FROM users WHERE role = 'Admin'");
    $stmt->execute();
    $result = $stmt->get_result();
    
    while ($admin = $result->fetch_assoc()) {
        // Do not notify if the admin is the actor
        if ($admin['uid'] === $actorId) continue;

        // Reuse 'promptId' column for ticketId to avoid schema changes, as both are INT
        // Ensure promptId allows INT. If ticketId is string in your logic but int in DB, cast it.
        $notif_stmt = $conn->prepare("INSERT INTO notifications (recipientId, actorId, actorName, actorPhotoURL, type, promptId, promptText, is_read, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())");
        $notif_stmt->bind_param("sssssis", $admin['uid'], $actorId, $actorName, $actorPhotoURL, $type, $ticketId, $snippet);
        $notif_stmt->execute();
        $notif_stmt->close();
    }
    $stmt->close();
}

function notify_user_support($conn, $type, $ticketId, $snippet, $recipientId, $actorName, $actorPhotoURL) {
    // Reuse 'promptId' column for ticketId
    $notif_stmt = $conn->prepare("INSERT INTO notifications (recipientId, actorId, actorName, actorPhotoURL, type, promptId, promptText, is_read, createdAt) VALUES (?, 'system', ?, ?, ?, ?, ?, 0, NOW())");
    $notif_stmt->bind_param("ssssis", $recipientId, $actorName, $actorPhotoURL, $type, $ticketId, $snippet);
    $notif_stmt->execute();
    $notif_stmt->close();
}

function handle_support_tickets($conn, $method, $id, $get_params, $post_data) {
    global $current_user_uid, $is_admin_request;
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

    if (!$current_user_uid) {
        send_error('Authentication required.', 401);
        return;
    }

    try {
        switch ($method) {
            case 'GET':
                if ($id) {
                     $stmt = $conn->prepare("SELECT * FROM support_tickets WHERE id = ?");
                     $stmt->bind_param("i", $id);
                     $stmt->execute();
                     $ticket = $stmt->get_result()->fetch_assoc();
                     
                     if (!$ticket) { send_error('Ticket not found', 404); return; }
                     
                     // Access control: Admin or Ticket Owner
                     if (!$is_admin_request && $ticket['userId'] !== $current_user_uid) {
                         send_error('Forbidden', 403);
                         return;
                     }
                     $ticket['id'] = (string)$ticket['id'];
                     send_json($ticket);
                } else {
                    $userId = $get_params['userId'] ?? null;
                    
                    // Query to include lastReplyByAdmin
                    $sql = "SELECT t.*, 
                            (SELECT isAdminReply FROM support_messages WHERE ticketId = t.id ORDER BY createdAt DESC LIMIT 1) as lastReplyByAdmin 
                            FROM support_tickets t";

                    if ($userId) {
                        // Fetch for specific user (User fetching own tickets)
                        if (!$is_admin_request && $userId !== $current_user_uid) {
                             send_error('Forbidden', 403); return;
                        }
                        $sql .= " WHERE userId = ? ORDER BY createdAt DESC";
                        $stmt = $conn->prepare($sql);
                        $stmt->bind_param("s", $userId);
                    } else {
                        // Fetch all (Admin fetching all tickets)
                        if (!$is_admin_request) { send_error('Forbidden', 403); return; }
                        $sql .= " ORDER BY createdAt DESC";
                        $stmt = $conn->prepare($sql);
                    }
                    
                    $stmt->execute();
                    $result = $stmt->get_result();
                    $tickets = [];
                    while ($row = $result->fetch_assoc()) {
                        $row['id'] = (string)$row['id'];
                        // Convert 1/0/NULL to boolean
                        $row['lastReplyByAdmin'] = (bool)($row['lastReplyByAdmin'] ?? 0);
                        $tickets[] = $row;
                    }
                    send_json($tickets);
                }
                break;

            case 'POST':
                // Create Ticket
                $userId = $current_user_uid;
                
                // Sanitize inputs
                $username = isset($post_data['username']) ? htmlspecialchars($post_data['username'], ENT_QUOTES, 'UTF-8') : 'Unknown';
                $userEmail = isset($post_data['userEmail']) ? htmlspecialchars($post_data['userEmail'], ENT_QUOTES, 'UTF-8') : '';
                $subject = isset($post_data['subject']) ? htmlspecialchars($post_data['subject'], ENT_QUOTES, 'UTF-8') : '';
                $category = isset($post_data['category']) ? htmlspecialchars($post_data['category'], ENT_QUOTES, 'UTF-8') : '';
                $status = 'open';
                
                if (empty($subject) || empty($category)) {
                    send_error('Subject and Category are required.', 400);
                    return;
                }
                
                if (strlen($subject) > 255) $subject = substr($subject, 0, 255);

                $stmt = $conn->prepare("INSERT INTO support_tickets (userId, username, userEmail, subject, category, status) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->bind_param("ssssss", $userId, $username, $userEmail, $subject, $category, $status);
                $stmt->execute();
                $newId = $stmt->insert_id;
                
                // --- NOTIFY ADMINS ---
                $u_stmt = $conn->prepare("SELECT photoURL FROM users WHERE uid = ?");
                $u_stmt->bind_param("s", $userId);
                $u_stmt->execute();
                $u_res = $u_stmt->get_result()->fetch_assoc();
                $userPhoto = $u_res['photoURL'] ?? null;
                $u_stmt->close();

                notify_admins_support($conn, 'ticket_created', $newId, $subject, $userId, $username, $userPhoto);
                // ---------------------

                $res_stmt = $conn->prepare("SELECT * FROM support_tickets WHERE id=?");
                $res_stmt->bind_param("i", $newId);
                $res_stmt->execute();
                $res = $res_stmt->get_result()->fetch_assoc();
                $res['id'] = (string)$res['id'];
                send_json($res);
                break;
                
            case 'PUT':
                if (!$id) send_error('Missing ID', 400);
                
                $status = $post_data['status'] ?? null;
                if (!$status) { send_error('Status is required', 400); return; }
                
                $allowed_statuses = ['open', 'closed', 'resolved'];
                if (!in_array($status, $allowed_statuses)) {
                    send_error('Invalid status value.', 400);
                    return;
                }
                
                $check_stmt = $conn->prepare("SELECT userId, subject, status FROM support_tickets WHERE id = ?");
                $check_stmt->bind_param("i", $id);
                $check_stmt->execute();
                $ticket = $check_stmt->get_result()->fetch_assoc();
                
                if (!$ticket) { send_error('Ticket not found', 404); return; }
                
                $oldStatus = $ticket['status'];

                if (!$is_admin_request) {
                    if ($ticket['userId'] !== $current_user_uid) {
                        send_error('Forbidden', 403); return;
                    }
                    if ($status === 'open') {
                        send_error('Users cannot re-open tickets.', 403);
                        return;
                    }
                }
                
                $stmt = $conn->prepare("UPDATE support_tickets SET status = ?, updatedAt = NOW() WHERE id = ?");
                $stmt->bind_param("si", $status, $id);
                $stmt->execute();

                // --- NOTIFY USER ---
                if ($is_admin_request && $oldStatus !== $status) {
                    notify_user_support(
                        $conn, 
                        'ticket_status', 
                        $id, 
                        $status, 
                        $ticket['userId'], 
                        'Support Team', 
                        null
                    );
                }
                // -------------------

                send_json(['status' => 'ok']);
                break;

            case 'DELETE':
                if (!$id) send_error('Missing ID', 400);
                
                if (!$is_admin_request) {
                    send_error('Forbidden: Only admins can delete tickets.', 403);
                    return;
                }

                $stmt = $conn->prepare("DELETE FROM support_tickets WHERE id = ?");
                $stmt->bind_param("i", $id);
                $stmt->execute();
                send_json(['id' => (string)$id, 'status' => 'ok']);
                break;
                
            default:
                send_error('Method not allowed', 405);
                break;
        }
    } catch (Exception $e) {
        send_error($e->getMessage(), 500);
    }
}

function handle_support_messages($conn, $method, $id, $get_params, $post_data) {
    global $current_user_uid, $is_admin_request;
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    
    if (!$current_user_uid) {
        send_error('Authentication required.', 401);
        return;
    }

    try {
        switch ($method) {
            case 'GET':
                $ticketId = $get_params['ticketId'];
                if (!$ticketId) send_error('Missing ticketId', 400);
                
                $check_stmt = $conn->prepare("SELECT userId FROM support_tickets WHERE id = ?");
                $check_stmt->bind_param("i", $ticketId);
                $check_stmt->execute();
                $ticket = $check_stmt->get_result()->fetch_assoc();
                
                if (!$ticket) { send_error('Ticket not found', 404); return; }
                if (!$is_admin_request && $ticket['userId'] !== $current_user_uid) {
                    send_error('Forbidden', 403); return;
                }

                $stmt = $conn->prepare("SELECT * FROM support_messages WHERE ticketId = ? ORDER BY createdAt ASC");
                $stmt->bind_param("i", $ticketId);
                $stmt->execute();
                $result = $stmt->get_result();
                $messages = [];
                while ($row = $result->fetch_assoc()) {
                    $row['id'] = (string)$row['id'];
                    $row['ticketId'] = (string)$row['ticketId'];
                    $row['isAdminReply'] = (bool)$row['isAdminReply'];
                    $messages[] = $row;
                }
                send_json($messages);
                break;

            case 'POST':
                $ticketId = $post_data['ticketId'];
                $text = $post_data['text'];
                $senderId = $current_user_uid;
                $senderName = $post_data['senderName'];
                $isAdminReply = $is_admin_request ? 1 : 0;
                
                if (empty($text) || empty($ticketId)) {
                    send_error('Text and ticketId are required.', 400);
                    return;
                }

                // Check ticket
                $check_stmt = $conn->prepare("SELECT userId, status FROM support_tickets WHERE id = ?");
                $check_stmt->bind_param("i", $ticketId);
                $check_stmt->execute();
                $ticket = $check_stmt->get_result()->fetch_assoc();
                
                if (!$ticket) { send_error('Ticket not found', 404); return; }
                if (!$is_admin_request && $ticket['userId'] !== $current_user_uid) {
                    send_error('Forbidden', 403); return;
                }
                
                if ($ticket['status'] === 'closed' && !$is_admin_request) {
                     send_error('Cannot reply to closed tickets.', 400); return;
                }

                $stmt = $conn->prepare("INSERT INTO support_messages (ticketId, senderId, senderName, text, isAdminReply) VALUES (?, ?, ?, ?, ?)");
                $stmt->bind_param("isssi", $ticketId, $senderId, $senderName, $text, $isAdminReply);
                $stmt->execute();
                $newId = $stmt->insert_id;
                
                // Update timestamp
                $upd_stmt = $conn->prepare("UPDATE support_tickets SET updatedAt = NOW() WHERE id = ?");
                $upd_stmt->bind_param("i", $ticketId);
                $upd_stmt->execute();
                
                // --- NOTIFICATIONS FOR REPLIES ---
                // 1. Get Sender Photo
                $u_stmt = $conn->prepare("SELECT photoURL FROM users WHERE uid = ?");
                $u_stmt->bind_param("s", $senderId);
                $u_stmt->execute();
                $u_res = $u_stmt->get_result()->fetch_assoc();
                $senderPhoto = $u_res['photoURL'] ?? null;
                $u_stmt->close();

                $snippet = mb_substr($text, 0, 50) . (mb_strlen($text) > 50 ? '...' : '');

                if ($isAdminReply) {
                    // Admin reply -> Notify User
                    notify_user_support(
                        $conn, 
                        'ticket_reply', 
                        $ticketId, 
                        $snippet, 
                        $ticket['userId'], 
                        $senderName, 
                        $senderPhoto
                    );
                } else {
                    // User reply -> Notify Admins
                    notify_admins_support(
                        $conn, 
                        'ticket_reply', 
                        $ticketId, 
                        $snippet, 
                        $senderId, 
                        $senderName, 
                        $senderPhoto
                    );
                }
                // ---------------------------------
                
                $res_stmt = $conn->prepare("SELECT * FROM support_messages WHERE id=?");
                $res_stmt->bind_param("i", $newId);
                $res_stmt->execute();
                $res = $res_stmt->get_result()->fetch_assoc();
                $res['id'] = (string)$res['id'];
                $res['ticketId'] = (string)$res['ticketId'];
                $res['isAdminReply'] = (bool)$res['isAdminReply'];
                
                send_json($res);
                break;
            default:
                send_error('Method not allowed', 405);
                break;
        }
    } catch (Exception $e) {
        send_error($e->getMessage(), 500);
    }
}
?>