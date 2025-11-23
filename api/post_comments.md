<?php
// Copied and adapted from api/comments.md
function clear_post_comments_cache($redis, $postId) {
    if (!$redis || !$postId) return;
    $redis->del('post_comments:post:' . $postId);
}

function check_comment_rate_limit($conn, $userId) {
    $result = $conn->query("SELECT setting_value FROM settings WHERE setting_key = 'commentRateLimitSeconds'");
    $rate_limit_seconds = (int)($result->fetch_assoc()['setting_value'] ?? 0);
    if ($rate_limit_seconds <= 0) return;

    $stmt = $conn->prepare("SELECT lastCommentAt FROM user_comment_timestamps WHERE userId = ?");
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $timestamp_row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if ($timestamp_row) {
        $seconds_since_last_comment = time() - strtotime($timestamp_row['lastCommentAt']);
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

function handle_post_comments($conn, $method, $id, $get_params, $post_data) {
    global $current_user_uid, $is_admin_request, $redis;
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    require_once 'api/posts.php';

    try {
        switch ($method) {
            case 'GET':
                if (isset($get_params['postId'])) {
                    $postId = $get_params['postId'];
                    $cacheKey = 'post_comments:post:' . $postId;
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

                    $stmt = $conn->prepare("SELECT c.*, u.photoURL as liveUserPhotoURL FROM post_comments c LEFT JOIN users u ON c.userId = u.uid WHERE c.postId = ? ORDER BY createdAt ASC");
                    $stmt->bind_param("s", $postId);
                } else {
                    $stmt = $conn->prepare("SELECT c.*, u.photoURL as liveUserPhotoURL FROM post_comments c LEFT JOIN users u ON c.userId = u.uid ORDER BY createdAt ASC");
                }
                $stmt->execute();
                $result = $stmt->get_result();
                $comments = [];
                while ($row = $result->fetch_assoc()) {
                    $row['id'] = (string)$row['id'];
                    $row['parentId'] = $row['parentId'] ? (string)$row['parentId'] : null;
                     if (isset($row['liveUserPhotoURL'])) { $row['userPhotoURL'] = $row['liveUserPhotoURL']; }
                    unset($row['liveUserPhotoURL']);
                    $row['replies'] = [];
                    $comments[] = $row;
                }
                $stmt->close();

                $commentMap = [];
                foreach ($comments as $comment) { $commentMap[$comment['id']] = $comment; }
                $rootComments = [];
                foreach ($commentMap as $commentId => &$commentNode) {
                    if ($commentNode['parentId'] && isset($commentMap[$commentNode['parentId']])) {
                        $commentMap[$commentNode['parentId']]['replies'][] = &$commentNode;
                    } else {
                        $rootComments[] = &$commentNode;
                    }
                }
                unset($commentNode);

                usort($rootComments, function($a, $b) { return strtotime($b['createdAt']) - strtotime($a['createdAt']); });
                
                $jsonResponse = json_encode($rootComments, JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);
                if ($redis && isset($cacheKey)) {
                    $redis->set($cacheKey, $jsonResponse, ['ex' => 300]);
                }
                echo $jsonResponse;
                break;

            case 'POST':
                if (!$current_user_uid) send_error('Authentication required', 401);
                check_comment_rate_limit($conn, $current_user_uid);
                $data = $post_data;
                $postId = $data['postId'];
                clear_post_comments_cache($redis, $postId);
                clear_posts_cache($redis);

                $conn->begin_transaction();
                try {
                    $parentId = isset($data['parentId']) && !empty($data['parentId']) ? $data['parentId'] : null;
                    $stmt = $conn->prepare("INSERT INTO post_comments (postId, parentId, userId, username, userPhotoURL, text, createdAt) VALUES (?, ?, ?, ?, ?, ?, NOW())");
                    $userPhotoURL = $data['userPhotoURL'] ?? null;
                    $sanitized_text = htmlspecialchars($data['text'], ENT_QUOTES, 'UTF-8');
                    $stmt->bind_param("ssssss", $postId, $parentId, $data['userId'], $data['username'], $userPhotoURL, $sanitized_text);
                    $stmt->execute();
                    $newId = $stmt->insert_id;
                    $stmt->close();

                    update_comment_timestamp($conn, $current_user_uid);
                    
                    $update_stmt = $conn->prepare("UPDATE posts SET commentCount = IFNULL(commentCount, 0) + 1 WHERE id = ?");
                    $update_stmt->bind_param("s", $postId);
                    $update_stmt->execute();
                    $update_stmt->close();
                    
                    $conn->commit();
                    
                    if ($current_user_uid && !empty($data['userId'])) {
                         // Reply Notification
                        if ($parentId) {
                            $parent_stmt = $conn->prepare("SELECT userId, text FROM post_comments WHERE id = ?");
                            $parent_stmt->bind_param("s", $parentId);
                            $parent_stmt->execute();
                            $parent_comment = $parent_stmt->get_result()->fetch_assoc();
                            $parent_stmt->close();
                            if ($parent_comment && $parent_comment['userId'] !== $data['userId']) {
                                $notification_stmt = $conn->prepare("INSERT INTO notifications (recipientId, actorId, actorName, actorPhotoURL, type, promptId, commentId, commentText, is_read, createdAt) VALUES (?, ?, ?, ?, 'comment-reply', ?, ?, ?, 0, NOW())");
                                // Fallback for mb_substr
                                $comment_text_snippet = function_exists('mb_substr') ? mb_substr($parent_comment['text'], 0, 50) : substr($parent_comment['text'], 0, 50);
                                
                                // For post comments, we reuse promptId field for postId as they share ID space in notifications generally, or handle by type
                                // assuming notifications handle both prompts and posts by ID
                                $notification_stmt->bind_param("sssssss", $parent_comment['userId'], $data['userId'], $data['username'], $userPhotoURL, $postId, $newId, $comment_text_snippet);
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
                                    $comment_text_snippet = function_exists('mb_substr') ? mb_substr($data['text'], 0, 50) : substr($data['text'], 0, 50);
                                    $notification_stmt->bind_param("sssssss", $mentioned_user['uid'], $data['userId'], $data['username'], $userPhotoURL, $postId, $newId, $comment_text_snippet);
                                    $notification_stmt->execute();
                                    $notification_stmt->close();
                                }
                            }
                            $user_stmt->close();
                        }
                    }

                    $res_stmt = $conn->prepare("SELECT * FROM post_comments WHERE id=?");
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

                $stmt_check = $conn->prepare("SELECT userId, postId FROM post_comments WHERE id = ?");
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
                clear_post_comments_cache($redis, $comment_to_edit['postId']);

                $stmt_update = $conn->prepare("UPDATE post_comments SET text = ?, updatedAt = NOW() WHERE id = ?");
                $sanitized_text = htmlspecialchars($data['text'], ENT_QUOTES, 'UTF-8');
                $stmt_update->bind_param("ss", $sanitized_text, $id);
                $stmt_update->execute();
                
                $res_stmt = $conn->prepare("SELECT * FROM post_comments WHERE id=?");
                $res_stmt->bind_param("s", $id);
                $res_stmt->execute();
                $res = $res_stmt->get_result()->fetch_assoc();
                $res['id'] = (string)$res['id'];
                send_json($res);
                break;

            case 'DELETE':
                if (!$current_user_uid) send_error('Authentication required', 401);
                if (!$id) send_error('Missing ID for DELETE request', 400);
            
                $conn->begin_transaction();
                try {
                    $stmt_check = $conn->prepare("SELECT userId, postId FROM post_comments WHERE id = ?");
                    $stmt_check->bind_param("s", $id);
                    $stmt_check->execute();
                    $comment_to_delete = $stmt_check->get_result()->fetch_assoc();
                    $stmt_check->close();
            
                    if (!$comment_to_delete) { $conn->rollback(); send_error('Comment not found', 404); return; }
            
                    if (!$is_admin_request && $comment_to_delete['userId'] !== $current_user_uid) {
                        $conn->rollback(); send_error('Permission denied', 403); return;
                    }

                    clear_post_comments_cache($redis, $comment_to_delete['postId']);
                    clear_posts_cache($redis);
            
                    $count_stmt = $conn->prepare("WITH RECURSIVE CommentTree AS (SELECT id FROM post_comments WHERE id = ? UNION ALL SELECT c.id FROM post_comments c JOIN CommentTree ct ON c.parentId = ct.id) SELECT COUNT(*) as totalToDelete FROM CommentTree");
                    $count_stmt->bind_param("s", $id);
                    $count_stmt->execute();
                    $total_to_delete = (int)($count_stmt->get_result()->fetch_assoc()['totalToDelete'] ?? 0);
                    $count_stmt->close();

                    $stmt_delete = $conn->prepare("DELETE FROM post_comments WHERE id = ?");
                    $stmt_delete->bind_param("s", $id);
                    $stmt_delete->execute();
            
                    if ($total_to_delete > 0) {
                        $update_stmt = $conn->prepare("UPDATE posts SET commentCount = GREATEST(0, IFNULL(commentCount, 0) - ?) WHERE id = ?");
                        $update_stmt->bind_param("is", $total_to_delete, $comment_to_delete['postId']);
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
        send_error("Database error in post_comments handler: " . $e->getMessage(), 500);
    }
}
?>