<?php
function add_points_to_user($conn, $userId, $points) {
    if (!$userId || $points <= 0) return false;
    try {
        $stmt = $conn->prepare("UPDATE users SET points = IFNULL(points, 0) + ? WHERE uid = ?");
        $stmt->bind_param("is", $points, $userId);
        $stmt->execute();
        $stmt->close();
        return true;
    } catch (Exception $e) {
        error_log("Failed to add points to user $userId: " . $e->getMessage());
        return false;
    }
}

function get_client_ip() {
    return $_SERVER['HTTP_CLIENT_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN';
}

function is_rate_limited($conn, $ip, $limit = 15, $period = 60) {
    global $redis;

    if ($redis) {
        $key = 'rate_limit:' . $ip;
        $current = $redis->incr($key);
        if ($current === 1) {
            $redis->expire($key, $period);
        }
        return $current > $limit;
    }

    // Fallback to MySQL if Redis is unavailable
    $conn->query("DELETE FROM rating_attempts WHERE timestamp < NOW() - INTERVAL $period SECOND");
    $stmt = $conn->prepare("INSERT INTO rating_attempts (ip_address) VALUES (?)");
    $stmt->bind_param("s", $ip);
    $stmt->execute();
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM rating_attempts WHERE ip_address = ? AND timestamp > NOW() - INTERVAL $period SECOND");
    $stmt->bind_param("s", $ip);
    $stmt->execute();
    $count = (int)($stmt->get_result()->fetch_assoc()['count'] ?? 0);
    return $count > $limit;
}

function get_all_averages($conn, $redis) {
    $cacheKey = 'ratings:all_averages';
    if ($redis) {
        $cached = $redis->get($cacheKey);
        if ($cached) return json_decode($cached, true);
    }

    $result = $conn->query("SELECT promptId, totalScore, count FROM prompt_ratings");
    $ratings = [];
    while ($row = $result->fetch_assoc()) {
        $ratings[$row['promptId']] = ['average' => $row['count'] > 0 ? $row['totalScore'] / $row['count'] : 0, 'count' => (int)$row['count']];
    }

    if ($redis) {
        $redis->set($cacheKey, json_encode($ratings), ['ex' => 3600]);
    }
    return $ratings;
}

function get_user_ratings($conn, $redis, $userId = null, $hashedIp = null) {
    if (!$userId && !$hashedIp) return [];

    $cacheKey = $userId ? 'ratings:user:' . $userId : 'ratings:guest:' . $hashedIp;
    if ($redis) {
        $cached = $redis->get($cacheKey);
        if ($cached) return json_decode($cached, true);
    }

    $ratings = [];
    $stmt = $userId 
        ? $conn->prepare("SELECT promptId, rating FROM ratings WHERE userId = ?")
        : $conn->prepare("SELECT promptId, rating FROM ratings WHERE hashedIp = ?");
    
    $userId ? $stmt->bind_param("s", $userId) : $stmt->bind_param("s", $hashedIp);
    
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $ratings[$row['promptId']] = (int)$row['rating'];
    }

    if ($redis) {
        $redis->set($cacheKey, json_encode($ratings), ['ex' => 3600]);
    }
    return $ratings;
}

function handle_get_ratings($conn, $get_params) {
    global $redis;
    
    // Helper to handle IP logic
    $client_ip = get_client_ip();
    $hashedIp = ($client_ip !== 'UNKNOWN') ? hash('sha256', $client_ip) : null;
    $userId = $get_params['userId'] ?? null;

    if (isset($get_params['action'])) {
        if ($get_params['action'] == 'all_averages') {
            $ratings = get_all_averages($conn, $redis);
            send_json($ratings);
        } elseif ($get_params['action'] == 'average' && isset($get_params['promptId'])) {
            // This is rarely used in bulk, so we can keep it simple or optimize similarly if needed
            $stmt = $conn->prepare("SELECT totalScore, count FROM prompt_ratings WHERE promptId = ?");
            $stmt->bind_param("i", $get_params['promptId']);
            $stmt->execute();
            $row = $stmt->get_result()->fetch_assoc();
            $response = $row && $row['count'] > 0 ? ['average' => $row['totalScore'] / $row['count'], 'count' => (int)$row['count']] : ['average' => 0, 'count' => 0];
            send_json($response);
        } elseif ($get_params['action'] == 'combined') {
            // Combined Action: Returns both averages and user-specific ratings
            $averages = get_all_averages($conn, $redis);
            $userRatings = get_user_ratings($conn, $redis, $userId, $hashedIp);
            
            send_json([
                'averageRatings' => $averages,
                'userRatings' => $userRatings
            ]);
        }
    } else {
        // Default: Get specific user ratings only
        $ratings = get_user_ratings($conn, $redis, $userId, $hashedIp);
        send_json($ratings);
    }
}

function handle_post_ratings($conn, $post_data) {
    global $redis;
    
    $client_ip = get_client_ip();
    if ($client_ip === 'UNKNOWN') { send_error('Could not identify client IP.', 400); }
    if (is_rate_limited($conn, $client_ip)) { send_error('Too many requests. Please wait a moment.', 429); }

    if (!isset($post_data['promptId'], $post_data['rating'])) { send_error('Missing required parameters.', 400); }
    $hashedIp = hash('sha256', $client_ip);
    $promptId = (int)$post_data['promptId'];
    $rating = (int)$post_data['rating'];
    $userId = $post_data['userId'] ?? null;
    
    // Clear relevant caches
    if ($redis) {
        $redis->del('ratings:all_averages');
        if ($userId) {
            $redis->del('ratings:user:' . $userId);
        } else {
            $redis->del('ratings:guest:' . $hashedIp);
        }
    }

    $conn->begin_transaction();
    try {
        $stmt = $userId 
            ? $conn->prepare("SELECT rating FROM ratings WHERE userId = ? AND promptId = ? FOR UPDATE")
            : $conn->prepare("SELECT rating FROM ratings WHERE hashedIp = ? AND promptId = ? FOR UPDATE");
        $userId ? $stmt->bind_param("si", $userId, $promptId) : $stmt->bind_param("si", $hashedIp, $promptId);
        $stmt->execute();
        $old_rating = (int)($stmt->get_result()->fetch_assoc()['rating'] ?? 0);
        
        if ($old_rating === $rating) { $conn->commit(); send_json(['status' => 'ok']); return; }

        $conn->query("INSERT INTO prompt_ratings (promptId) VALUES ($promptId) ON DUPLICATE KEY UPDATE promptId=promptId");
        
        $score_diff = $rating - $old_rating;
        $count_diff = ($old_rating == 0 && $rating > 0) ? 1 : (($old_rating > 0 && $rating == 0) ? -1 : 0);

        if ($score_diff != 0 || $count_diff != 0) {
            $stmt = $conn->prepare("UPDATE prompt_ratings SET totalScore = totalScore + ?, count = count + ? WHERE promptId = ?");
            $stmt->bind_param("iii", $score_diff, $count_diff, $promptId);
            $stmt->execute();
        }

        if ($rating == 0) {
            $stmt = $userId 
                ? $conn->prepare("DELETE FROM ratings WHERE userId = ? AND promptId = ?")
                : $conn->prepare("DELETE FROM ratings WHERE hashedIp = ? AND promptId = ?");
            $userId ? $stmt->bind_param("si", $userId, $promptId) : $stmt->bind_param("si", $hashedIp, $promptId);
        } else {
            if ($userId) {
                $stmt = $conn->prepare("INSERT INTO ratings (userId, promptId, rating, hashedIp) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE rating = VALUES(rating), hashedIp = VALUES(hashedIp)");
                $stmt->bind_param("siis", $userId, $promptId, $rating, $hashedIp);
            } else {
                $stmt = $conn->prepare("INSERT INTO ratings (hashedIp, promptId, rating, userId) VALUES (?, ?, ?, NULL) ON DUPLICATE KEY UPDATE rating = VALUES(rating)");
                $stmt->bind_param("sii", $hashedIp, $promptId, $rating);
            }
        }
        $stmt->execute();

        define('POINTS_RATING_5_STAR', 2);
        if ($rating === 5 && $old_rating !== 5) {
            $prompt_stmt = $conn->prepare("SELECT authorId FROM prompts WHERE id = ?");
            $prompt_stmt->bind_param("i", $promptId);
            $prompt_stmt->execute();
            $prompt_author = $prompt_stmt->get_result()->fetch_assoc();
            if ($prompt_author && !empty($prompt_author['authorId']) && $prompt_author['authorId'] !== $userId) {
                add_points_to_user($conn, $prompt_author['authorId'], POINTS_RATING_5_STAR);
            }
        }
        $conn->commit();
        send_json(['status' => 'ok']);
    } catch (Exception $e) {
        $conn->rollback();
        send_error("Database transaction failed: " . $e->getMessage(), 500);
    }
}

function handle_ratings($conn, $method, $get_params, $post_data) {
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    try {
        if ($method == 'GET') {
            handle_get_ratings($conn, $get_params);
        } elseif ($method == 'POST') {
            handle_post_ratings($conn, $post_data);
        } else {
            send_error('Method not allowed', 405);
        }
    } catch (Exception $e) {
        send_error("Error in ratings handler: " . $e->getMessage(), 500);
    }
}
?>