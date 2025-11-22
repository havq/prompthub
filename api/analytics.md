<?php
// api/analytics.php

/**
 * Handles fetching aggregated analytics data for a specific user.
 * This is a Pro feature and requires authentication.
 */
function handle_analytics($conn, $method, $get_params) {
    global $current_user_uid, $is_admin_request;
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

    if ($method !== 'GET') {
        send_error('Method not allowed for analytics resource.', 405);
        return;
    }

    $userId = $get_params['userId'] ?? null;
    if (!$userId) {
        send_error('User ID is required.', 400);
        return;
    }

    // Security check: Only the user themselves or an admin can view analytics.
    if ($userId !== $current_user_uid && !$is_admin_request) {
        send_error('Forbidden: You can only view your own analytics.', 403);
        return;
    }

    // Pagination parameters
    $limit = isset($get_params['limit']) ? (int)$get_params['limit'] : 10;
    $page = isset($get_params['page']) ? (int)$get_params['page'] : 1;
    $offset = ($page - 1) * $limit;

    try {
        $analytics_data = [
            'totalViews' => 0,
            'totalFavorites' => 0,
            'totalRemixes' => 0,
            'totalCollections' => 0,
            'topPrompts' => [],
            'totalUserPrompts' => 0
        ];
        
        // 1. Get total views and remixes from the prompts table
        $stmt = $conn->prepare("SELECT SUM(viewCount) as totalViews, SUM(remixCount) as totalRemixes FROM prompts WHERE authorId = ?");
        $stmt->bind_param("s", $userId);
        $stmt->execute();
        $prompt_stats = $stmt->get_result()->fetch_assoc();
        $analytics_data['totalViews'] = (int)($prompt_stats['totalViews'] ?? 0);
        $analytics_data['totalRemixes'] = (int)($prompt_stats['totalRemixes'] ?? 0);
        $stmt->close();

        // 2. Get total favorites
        $stmt = $conn->prepare("SELECT COUNT(f.promptId) as totalFavorites FROM favorites f JOIN prompts p ON f.promptId = p.id WHERE p.authorId = ?");
        $stmt->bind_param("s", $userId);
        $stmt->execute();
        $fav_stats = $stmt->get_result()->fetch_assoc();
        $analytics_data['totalFavorites'] = (int)($fav_stats['totalFavorites'] ?? 0);
        $stmt->close();

        // 3. Get total times prompts were added to collections (optimized)
        $stmt = $conn->prepare("SELECT promptIds FROM collections WHERE promptIds IS NOT NULL AND promptIds != '{}'");
        $stmt->execute();
        $collections_result = $stmt->get_result();
        
        $user_prompt_ids_stmt = $conn->prepare("SELECT id FROM prompts WHERE authorId = ?");
        $user_prompt_ids_stmt->bind_param("s", $userId);
        $user_prompt_ids_stmt->execute();
        $prompts_result = $user_prompt_ids_stmt->get_result();
        $user_prompt_id_set = [];
        while ($row = $prompts_result->fetch_assoc()) {
            $user_prompt_id_set[(string)$row['id']] = true;
        }
        $user_prompt_ids_stmt->close();
        
        $total_collections = 0;
        if (!empty($user_prompt_id_set)) {
            while ($collection_row = $collections_result->fetch_assoc()) {
                $prompt_ids_map = json_decode($collection_row['promptIds'], true);
                if (is_array($prompt_ids_map)) {
                    $intersecting_keys = array_intersect_key($user_prompt_id_set, $prompt_ids_map);
                    $total_collections += count($intersecting_keys);
                }
            }
        }
        $analytics_data['totalCollections'] = $total_collections;
        $stmt->close();

        // NEW: Get total number of user's prompts for pagination
        $total_prompts_stmt = $conn->prepare("SELECT COUNT(*) as total FROM prompts WHERE authorId = ?");
        $total_prompts_stmt->bind_param("s", $userId);
        $total_prompts_stmt->execute();
        $total_user_prompts = $total_prompts_stmt->get_result()->fetch_assoc()['total'];
        $analytics_data['totalUserPrompts'] = (int)$total_user_prompts;
        $total_prompts_stmt->close();

        // 4. Get top performing prompts (PAGINATED)
        $top_prompts_sql = "
            SELECT 
                p.*,
                (SELECT COUNT(*) FROM favorites WHERE promptId = p.id) as favoriteCount,
                (SELECT COUNT(*) FROM collections c WHERE JSON_EXTRACT(c.promptIds, CONCAT('$.\"', p.id, '\"')) IS NOT NULL) as collectionCount
            FROM prompts p
            WHERE p.authorId = ?
            ORDER BY p.viewCount DESC, favoriteCount DESC, p.remixCount DESC
            LIMIT ? OFFSET ?
        ";
        $stmt = $conn->prepare($top_prompts_sql);
        $stmt->bind_param("sii", $userId, $limit, $offset);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $row['id'] = (string)$row['id'];
            $row['categoryIds'] = json_decode($row['categoryIds'] ?: '[]');
            $row['tags'] = json_decode($row['tags'] ?: '[]');
            $row['viewCount'] = (int)($row['viewCount'] ?? 0);
            $row['remixCount'] = (int)($row['remixCount'] ?? 0);
            $row['favoriteCount'] = (int)($row['favoriteCount'] ?? 0);
            $row['collectionCount'] = (int)($row['collectionCount'] ?? 0);
            $analytics_data['topPrompts'][] = $row;
        }
        $stmt->close();
        
        send_json($analytics_data);

    } catch (Exception $e) {
        send_error("Database error while fetching analytics: " . $e->getMessage(), 500);
    }
}
?>