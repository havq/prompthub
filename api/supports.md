<?php
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
                    if ($userId) {
                        // Fetch for specific user (User fetching own tickets)
                        if (!$is_admin_request && $userId !== $current_user_uid) {
                             send_error('Forbidden', 403); return;
                        }
                        $stmt = $conn->prepare("SELECT * FROM support_tickets WHERE userId = ? ORDER BY createdAt DESC");
                        $stmt->bind_param("s", $userId);
                    } else {
                        // Fetch all (Admin fetching all tickets)
                        if (!$is_admin_request) { send_error('Forbidden', 403); return; }
                        $stmt = $conn->prepare("SELECT * FROM support_tickets ORDER BY createdAt DESC");
                    }
                    
                    $stmt->execute();
                    $result = $stmt->get_result();
                    $tickets = [];
                    while ($row = $result->fetch_assoc()) {
                        $row['id'] = (string)$row['id'];
                        $tickets[] = $row;
                    }
                    send_json($tickets);
                }
                break;

            case 'POST':
                // Create Ticket
                $userId = $current_user_uid;
                $username = $post_data['username'] ?? 'Unknown';
                $userEmail = $post_data['userEmail'] ?? '';
                $subject = $post_data['subject'];
                $category = $post_data['category'];
                $status = 'open';
                
                if (empty($subject) || empty($category)) {
                    send_error('Subject and Category are required.', 400);
                    return;
                }

                $stmt = $conn->prepare("INSERT INTO support_tickets (userId, username, userEmail, subject, category, status) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->bind_param("ssssss", $userId, $username, $userEmail, $subject, $category, $status);
                $stmt->execute();
                $newId = $stmt->insert_id;
                
                $res_stmt = $conn->prepare("SELECT * FROM support_tickets WHERE id=?");
                $res_stmt->bind_param("i", $newId);
                $res_stmt->execute();
                $res = $res_stmt->get_result()->fetch_assoc();
                $res['id'] = (string)$res['id'];
                send_json($res);
                break;
                
            case 'PUT':
                if (!$id) send_error('Missing ID', 400);
                
                // Update Status
                $status = $post_data['status'] ?? null;
                if (!$status) { send_error('Status is required', 400); return; }
                
                $check_stmt = $conn->prepare("SELECT userId FROM support_tickets WHERE id = ?");
                $check_stmt->bind_param("i", $id);
                $check_stmt->execute();
                $ticket = $check_stmt->get_result()->fetch_assoc();
                
                if (!$ticket) { send_error('Ticket not found', 404); return; }
                
                // Only admin can update status freely. Users might be restricted (e.g. only close).
                // For simplicity, we allow owner to close, admin to set any status.
                if (!$is_admin_request) {
                    if ($ticket['userId'] !== $current_user_uid) {
                        send_error('Forbidden', 403); return;
                    }
                    // User can likely only set status to 'closed' or 'resolved'
                    // if ($status !== 'closed') { send_error('Users can only close tickets.', 403); return; }
                }
                
                $stmt = $conn->prepare("UPDATE support_tickets SET status = ?, updatedAt = NOW() WHERE id = ?");
                $stmt->bind_param("si", $status, $id);
                $stmt->execute();
                send_json(['status' => 'ok']);
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
                
                // Check ticket access
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

                // Check ticket access
                $check_stmt = $conn->prepare("SELECT userId, status FROM support_tickets WHERE id = ?");
                $check_stmt->bind_param("i", $ticketId);
                $check_stmt->execute();
                $ticket = $check_stmt->get_result()->fetch_assoc();
                
                if (!$ticket) { send_error('Ticket not found', 404); return; }
                if (!$is_admin_request && $ticket['userId'] !== $current_user_uid) {
                    send_error('Forbidden', 403); return;
                }
                
                // Optional: Prevent commenting on closed tickets
                if ($ticket['status'] === 'closed' && !$is_admin_request) {
                     send_error('Cannot reply to closed tickets.', 400); return;
                }

                $stmt = $conn->prepare("INSERT INTO support_messages (ticketId, senderId, senderName, text, isAdminReply) VALUES (?, ?, ?, ?, ?)");
                $stmt->bind_param("isssi", $ticketId, $senderId, $senderName, $text, $isAdminReply);
                $stmt->execute();
                $newId = $stmt->insert_id;
                
                // Update ticket updated_at
                $upd_stmt = $conn->prepare("UPDATE support_tickets SET updatedAt = NOW() WHERE id = ?");
                $upd_stmt->bind_param("i", $ticketId);
                $upd_stmt->execute();
                
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