<?php
// api/reel_comments.php

function check_comment_rate_limit($conn, $userId) {
    // 1. Get setting from DB
    $result = $conn->query("SELECT setting_value FROM settings WHERE setting_key = 'commentRateLimitSeconds'");
    $rate_limit_seconds = (int)($result->fetch_assoc()['setting_value'] ?? 0);

    if ($rate_limit_seconds <= 0) {
        return; // Rate limiting is disabled
    }

    // 2. Check user's last comment time
    $stmt = $conn->prepare("SELECT lastCommentAt FROM user_comment_timestamps WHERE userId = ?");
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $timestamp_row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($timestamp_row) {
        $last_comment_time = strtotime($timestamp_row['lastCommentAt']);
        $current_time = time();
        $seconds_since_last_comment = $current_time - $last_comment_time;

        if ($seconds_since_last_comment < $rate_limit_seconds) {
            send_error('You are posting comments too frequently. Please wait ' . ($rate_limit_seconds - $seconds_since_last_comment) . ' more seconds.', 429);
        }
    }
}

function update_comment_timestamp($conn, $userId) {
    $stmt = $conn->prepare("INSERT INTO user_comment_timestamps (userId, lastCommentAt) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE lastCommentAt = NOW()");
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $stmt->close();
}

function clear_reel_comments_cache($redis, $reelId) {
    if (!$redis || !$reelId) return;
    $keys = $redis->keys('reel_comments:reel:' . $reelId . ':*');
    if ($keys && count($keys) > 0) {
        $redis->del($keys);
    }
}

function handle_reel_comments($conn, $method, $id, $get_params, $post_data) {
    global $current_user_uid, $is_admin_request, $redis;
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    require_once 'api/reels.md';

    try {
        if ($method === 'POST' && isset($get_params['action']) && $get_params['action'] === 'like') {
            if (!$id) send_error('Comment ID is required.', 400);
            if (!$current_user_uid) send_error('Authentication required.', 401);

            $comment_stmt = $conn->prepare("SELECT reelId FROM reel_comments WHERE id = ?");
            $comment_stmt->bind_param("s", $id);
            $comment_stmt->execute();
            $comment_details = $comment_stmt->get_result()->fetch_assoc();
            $comment_stmt->close();
            if ($comment_details) {
                clear_reel_comments_cache($redis, $comment_details['reelId']);
            }
            
            $conn->begin_transaction();
            try {
                $stmt_check = $conn->prepare("SELECT 1 FROM user_reel_comment_likes WHERE userId = ? AND commentId = ?");
                $stmt_check->bind_param("ss", $current_user_uid, $id);
                $stmt_check->execute();
                $is_liked = $stmt_check->get_result()->num_rows > 0;
                $stmt_check->close();

                if ($is_liked) {
                    $stmt_toggle = $conn->prepare("DELETE FROM user_reel_comment_likes WHERE userId = ? AND commentId = ?");
                    $stmt_toggle->bind_param("ss", $current_user_uid, $id);
                    $increment = -1;
                } else {
                    $stmt_toggle = $conn->prepare("INSERT INTO user_reel_comment_likes (userId, commentId) VALUES (?, ?)");
                    $stmt_toggle->bind_param("ss", $current_user_uid, $id);
                    $increment = 1;
                }
                $stmt_toggle->execute();
                $stmt_toggle->close();

                $stmt_update = $conn->prepare("UPDATE reel_comments SET likeCount = GREATEST(0, IFNULL(likeCount, 0) + ?) WHERE id = ?");
                $stmt_update->bind_param("is", $increment, $id);
                $stmt_update->execute();
                $stmt_update->close();

                if (!$is_liked) {
                    $comment_stmt = $conn->prepare("SELECT userId, reelId, text FROM reel_comments WHERE id = ?");
                    $comment_stmt->bind_param("s", $id);
                    $comment_stmt->execute();
                    $comment_details = $comment_stmt->get_result()->fetch_assoc();
                    $comment_stmt->close();
                    if ($comment_details && $comment_details['userId'] !== $current_user_uid) {
                        $actor_stmt = $conn->prepare("SELECT username, photoURL FROM users WHERE uid = ?");
                        $actor_stmt->bind_param("s", $current_user_uid);
                        $actor_stmt->execute();
                        $actor = $actor_stmt->get_result()->fetch_assoc();
                        $actor_stmt->close();
                        $notification_stmt = $conn->prepare(
                            "INSERT INTO notifications (recipientId, actorId, actorName, actorPhotoURL, type, promptId, commentId, commentText, is_read, createdAt) VALUES (?, ?, ?, ?, 'comment-like', ?, ?, ?, 0, NOW())"
                        );
                        $comment_text_snippet = mb_substr($comment_details['text'], 0, 50);
                        $actorPhotoURL = $actor['photoURL'] ?? null;
                        $notification_stmt->bind_param("sssssss", $comment_details['userId'], $current_user_uid, $actor['username'], $actorPhotoURL, $comment_details['reelId'], $id, $comment_text_snippet);
                        $notification_stmt->execute();
                        $notification_stmt->close();
                    }
                }
                $conn->commit();
                send_json(['status' => 'ok', 'liked' => !$is_liked]);
            } catch (Exception $e) {
                $conn->rollback();
                throw $e;
            }
            return;
        }

        switch ($method) {
            case 'GET':
                if (empty($get_params['reelId'])) {
                    send_error('reelId is required', 400);
                    return;
                }
                $reelId = $get_params['reelId'];
                $cacheKey = 'reel_comments:reel:' . $reelId . ':' . ($current_user_uid ?? 'guest');
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

                $stmt = $conn->prepare("SELECT c.*, u.photoURL as userPhotoURL FROM reel_comments c LEFT JOIN users u ON c.userId = u.uid WHERE c.reelId = ? ORDER BY c.createdAt ASC");
                $stmt->bind_param("s", $reelId);
                $stmt->execute();
                $result = $stmt->get_result();
                $comments = [];
                while ($row = $result->fetch_assoc()) {
                    $row['id'] = (string)$row['id'];
                    $row['parentId'] = $row['parentId'] ? (string)$row['parentId'] : null;
                    $row['likeCount'] = (int)($row['likeCount'] ?? 0);
                    $row['userPhotoURL'] = $row['userPhotoURL'] ?? null; // Ensure we get the latest photoURL from the JOIN
                    $row['replies'] = [];
                    $comments[] = $row;
                }
                $stmt->close();

                $response = ['comments' => [], 'likedIds' => []];
                if ($current_user_uid && !empty($comments)) {
                    $comment_ids = array_map('intval', array_column($comments, 'id'));
                    if (!empty($comment_ids)) {
                        $likes_stmt = $conn->prepare("SELECT commentId FROM user_reel_comment_likes WHERE userId = ? AND commentId IN (" . implode(',', array_fill(0, count($comment_ids), '?')) . ")");
                        $types = 's' . str_repeat('s', count($comment_ids));
                        $likes_stmt->bind_param($types, $current_user_uid, ...$comment_ids);
                        $likes_stmt->execute();
                        $liked_result = $likes_stmt->get_result();
                        $liked_ids = [];
                        while ($row = $liked_result->fetch_assoc()) {
                            $liked_ids[(string)$row['commentId']] = true;
                        }
                        $response['likedIds'] = $liked_ids;
                    }
                }

                $commentMap = [];
                foreach ($comments as $comment) { $commentMap[$comment['id']] = $comment; }
                foreach ($commentMap as $id => &$comment_ref) {
                    if ($comment_ref['parentId'] && isset($commentMap[$comment_ref['parentId']])) {
                        $commentMap[$comment_ref['parentId']]['replies'][] = &$comment_ref;
                    }
                }
                unset($comment_ref);
                $rootComments = array_filter($commentMap, function($comment) { return $comment['parentId'] === null; });
                usort($rootComments, function($a, $b) { return strtotime($b['createdAt']) - strtotime($a['createdAt']); });
                $response['comments'] = array_values($rootComments);

                $jsonResponse = json_encode($response, JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);
                if ($redis) {
                    $redis->set($cacheKey, $jsonResponse, ['ex' => 300]);
                }
                echo $jsonResponse;
                break;

            case 'POST':
                if (!$current_user_uid) { send_error('Authentication required', 401); return; }
                check_comment_rate_limit($conn, $current_user_uid);
                $data = $post_data;
                if (empty($data['reelId']) || empty($data['text'])) { send_error('reelId and text are required', 400); return; }
                
                clear_reel_comments_cache($redis, $data['reelId']);
                clear_reels_cache($redis);

                $conn->begin_transaction();
                try {
                    $stmt = $conn->prepare("INSERT INTO reel_comments (reelId, parentId, userId, username, userPhotoURL, text, createdAt) VALUES (?, ?, ?, ?, ?, ?, NOW())");
                    $userPhotoURL = $data['userPhotoURL'] ?? null;
                    $parentId = $data['parentId'] ?? null;
                    $sanitized_text = htmlspecialchars($data['text'], ENT_QUOTES, 'UTF-8');
                    $stmt->bind_param("ssssss", $data['reelId'], $parentId, $data['userId'], $data['username'], $userPhotoURL, $sanitized_text);
                    $stmt->execute();
                    $newId = $stmt->insert_id;
                    $stmt->close();

                    update_comment_timestamp($conn, $current_user_uid);

                    $update_stmt = $conn->prepare("UPDATE reels SET commentCount = IFNULL(commentCount, 0) + 1 WHERE id = ?");
                    $update_stmt->bind_param("s", $data['reelId']);
                    $update_stmt->execute();
                    $update_stmt->close();
                    
                    if ($current_user_uid && !empty($data['userId'])) {
                        // Reply Notification
                        if ($parentId) {
                            $parent_stmt = $conn->prepare("SELECT userId, text, reelId FROM reel_comments WHERE id = ?");
                            $parent_stmt->bind_param("s", $parentId);
                            $parent_stmt->execute();
                            $parent_comment = $parent_stmt->get_result()->fetch_assoc();
                            $parent_stmt->close();
                            if ($parent_comment && $parent_comment['userId'] !== $data['userId']) {
                                $notification_stmt = $conn->prepare("INSERT INTO notifications (recipientId, actorId, actorName, actorPhotoURL, type, promptId, commentId, commentText, is_read, createdAt) VALUES (?, ?, ?, ?, 'comment-reply', ?, ?, ?, 0, NOW())");
                                $comment_text_snippet = mb_substr($data['text'], 0, 50);
                                $notification_stmt->bind_param("sssssss", $parent_comment['userId'], $data['userId'], $data['username'], $userPhotoURL, $parent_comment['reelId'], $newId, $comment_text_snippet);
                                $notification_stmt->execute();
                                $notification_stmt->close();
                            }
                        }
                        // Mention Notification
                        preg_match_all('/@(\w+)/', $data['text'], $matches);
                        $mentioned_usernames = array_unique($matches[1]);
                        if (!empty($mentioned_usernames)) {
                            $placeholders = implode(',', array_fill(0, count($mentioned_usernames), '?'));
                            $types = str_repeat('s', count($mentioned_usernames));
                            $user_stmt = $conn->prepare("SELECT uid FROM users WHERE username IN ($placeholders)");
                            $user_stmt->bind_param($types, ...$mentioned_usernames);
                            $user_stmt->execute();
                            $result = $user_stmt->get_result();
                            while ($mentioned_user = $result->fetch_assoc()) {
                                if ($mentioned_user['uid'] !== $data['userId']) {
                                    $notification_stmt = $conn->prepare("INSERT INTO notifications (recipientId, actorId, actorName, actorPhotoURL, type, promptId, commentId, commentText, is_read, createdAt) VALUES (?, ?, ?, ?, 'comment-mention', ?, ?, ?, 0, NOW())");
                                    $comment_text_snippet = mb_substr($data['text'], 0, 50);
                                    $notification_stmt->bind_param("sssssss", $mentioned_user['uid'], $data['userId'], $data['username'], $userPhotoURL, $data['reelId'], $newId, $comment_text_snippet);
                                    $notification_stmt->execute();
                                    $notification_stmt->close();
                                }
                            }
                            $user_stmt->close();
                        }
                    }

                    $conn->commit();
                    $res_stmt = $conn->prepare("SELECT * FROM reel_comments WHERE id=?");
                    $res_stmt->bind_param("s", $newId);
                    $res_stmt->execute();
                    $res = $res_stmt->get_result()->fetch_assoc();
                    $res['id'] = (string)$res['id'];
                    send_json($res);
                } catch (Exception $e) {
                    $conn->rollback();
                    throw $e;
                }
                break;
            
            case 'PUT':
                if (!$current_user_uid) send_error('Authentication required', 401);
                if (!$id) send_error('Missing ID for PUT request', 400);
                
                $data = $post_data;
                if (!isset($data['text'])) send_error('Missing text for comment update', 400);

                $stmt_check = $conn->prepare("SELECT userId, reelId FROM reel_comments WHERE id = ?");
                $stmt_check->bind_param("s", $id);
                $stmt_check->execute();
                $comment_to_edit = $stmt_check->get_result()->fetch_assoc();
                $stmt_check->close();

                if (!$comment_to_edit) {
                    send_error('Comment not found', 404);
                    return;
                }

                if (!$is_admin_request && $comment_to_edit['userId'] !== $current_user_uid) {
                    send_error('Permission denied to edit this comment', 403);
                    return;
                }
                clear_reel_comments_cache($redis, $comment_to_edit['reelId']);

                $stmt_update = $conn->prepare("UPDATE reel_comments SET text = ?, updatedAt = NOW() WHERE id = ?");
                $sanitized_text = htmlspecialchars($data['text'], ENT_QUOTES, 'UTF-8');
                $stmt_update->bind_param("ss", $sanitized_text, $id);
                $stmt_update->execute();
                
                $res_stmt = $conn->prepare("SELECT * FROM reel_comments WHERE id=?");
                $res_stmt->bind_param("s", $id);
                $res_stmt->execute();
                $res = $res_stmt->get_result()->fetch_assoc();
                $res['id'] = (string)$res['id'];
                send_json($res);
                break;

            case 'DELETE':
                if (!$current_user_uid) { send_error('Authentication required', 401); return; }
                if (!$id) { send_error('Missing comment ID for DELETE request', 400); return; }
                
                $conn->begin_transaction();
                try {
                    $get_stmt = $conn->prepare("SELECT id, reelId, userId FROM reel_comments WHERE id = ?");
                    $get_stmt->bind_param("s", $id);
                    $get_stmt->execute();
                    $comment = $get_stmt->get_result()->fetch_assoc();
                    $get_stmt->close();

                    if (!$comment) { $conn->rollback(); send_error('Comment not found', 404); return; }
                    if (!$is_admin_request && $comment['userId'] !== $current_user_uid) { $conn->rollback(); send_error('Permission denied', 403); return; }

                    clear_reel_comments_cache($redis, $comment['reelId']);
                    clear_reels_cache($redis);
                    
                    $count_stmt = $conn->prepare("WITH RECURSIVE CommentTree AS (SELECT id FROM reel_comments WHERE id = ? UNION ALL SELECT c.id FROM reel_comments c JOIN CommentTree ct ON c.parentId = ct.id) SELECT COUNT(*) as totalToDelete FROM CommentTree");
                    $count_stmt->bind_param("s", $id);
                    $count_stmt->execute();
                    $total_to_delete = (int)($count_stmt->get_result()->fetch_assoc()['totalToDelete'] ?? 0);
                    $count_stmt->close();
                    
                    $del_stmt = $conn->prepare("DELETE FROM reel_comments WHERE id = ?");
                    $del_stmt->bind_param("s", $id);
                    $del_stmt->execute();

                    if ($total_to_delete > 0) {
                        $update_stmt = $conn->prepare("UPDATE reels SET commentCount = GREATEST(0, IFNULL(commentCount, 0) - ?) WHERE id = ?");
                        $update_stmt->bind_param("is", $total_to_delete, $comment['reelId']);
                        $update_stmt->execute();
                        $update_stmt->close();
                    }
                    
                    $conn->commit();
                    send_json(['id' => (string)$id, 'deletedCount' => $total_to_delete]);
                } catch (Exception $e) {
                    $conn->rollback();
                    throw $e;
                }
                break;

            default:
                send_error('Method not allowed', 405);
                break;
        }
    } catch (Exception $e) {
        send_error("Database error in reel_comments handler: " . $e->getMessage(), 500);
    }
}
?>