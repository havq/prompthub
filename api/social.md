<?php
function handle_social($conn, $method, $post_data) {
    global $redis;
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    require_once 'api/users.md';

    if ($method !== 'POST') {
        send_error('Method not allowed', 405);
        return;
    }
    
    $data = $post_data;
    if (empty($data['followerId']) || empty($data['followingId']) || empty($data['action'])) {
        send_error('Missing parameters', 400);
        return;
    }

    $followerId = $data['followerId'];
    $followingId = $data['followingId'];
    
    clear_users_cache($redis, $followerId);
    clear_users_cache($redis, $followingId);

    $conn->begin_transaction();
    try {
        $action = $data['action'];
        
        $increment = ($action == 'follow') ? 1 : -1;

        $stmt = $conn->prepare("UPDATE users SET followerCount = GREATEST(0, IFNULL(followerCount, 0) + ?) WHERE uid = ?");
        $stmt->bind_param("is", $increment, $followingId);
        $stmt->execute();
        $stmt->close();

        $stmt = $conn->prepare("SELECT following FROM users WHERE uid = ? FOR UPDATE");
        $stmt->bind_param("s", $followerId);
        $stmt->execute();
        $res = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        $following = $res ? (json_decode($res['following'], true) ?? []) : [];
        
        if ($action == 'follow') {
            $following[$followingId] = true;
        } else { // unfollow
            unset($following[$followingId]);
        }
        
        $jsonFollowing = json_encode($following);
        $stmt = $conn->prepare("UPDATE users SET following = ? WHERE uid = ?");
        $stmt->bind_param("ss", $jsonFollowing, $followerId);
        $stmt->execute();
        $stmt->close();
        
        $conn->commit();
        send_json(['status' => 'ok']);
    } catch (Exception $e) {
        $conn->rollback();
        send_error('Database transaction failed: ' . $e->getMessage(), 500);
    }
}
?>