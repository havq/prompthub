<?php
// api.php

error_reporting(0);

// --- SECURE SESSION COOKIE CONFIGURATION ---
ini_set('session.cookie_secure', 1); 
ini_set('session.cookie_httponly', 1); 
ini_set('session.cookie_samesite', 'None'); 

// --- CORS & HEADERS ---
// $allowed_origins = [
//     'http://localhost:3000',
//     'http://localhost:5173',
//     'https://prompthub.today',
//     'https://www.prompthub.today'
// ];

// $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
// if (in_array($origin, $allowed_origins)) {
//     header("Access-Control-Allow-Origin: $origin");
// }
header("Access-Control-Allow-Origin: *"); // REMOVED for security

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- DEPENDENCIES & DB CONNECTION ---
if (file_exists('vendor/autoload.php')) {
    require_once 'vendor/autoload.php';
}
require_once 'db.php'; 

// --- REDIS CACHE CONNECTION ---
$redis = new Redis();
try {
    // Connect to the default Redis server on localhost
    $redis->connect('127.0.0.1', 6379);
    // Use the following line if your Redis server requires a password
    $redis->auth('dsjweunbert235');
} catch (RedisException $e) {
    // If Redis connection fails, log the error and let the app run without caching.
    error_log('Could not connect to Redis: ' . $e->getMessage());
    $redis = null;
}


use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use GuzzleHttp\Client;

// --- HELPER FUNCTIONS ---
function send_json($data) {
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);
}

function send_error($message, $code = 400) {
    http_response_code($code);
    send_json(['error' => $message]);
    exit();
}

// --- AUTHENTICATION FUNCTIONS ---
function get_decoded_token($project_id) {
    if (!isset($_SERVER['HTTP_AUTHORIZATION'])) {
        return null;
    }

    $auth_header = $_SERVER['HTTP_AUTHORIZATION'];
    if (!preg_match('/Bearer\s(\S+)/', $auth_header, $matches)) {
        return null;
    }
    $jwt = $matches[1];

    $cache_file = sys_get_temp_dir() . '/firebase_jwt_public_keys.json';
    $keys = [];
    if (file_exists($cache_file) && (filemtime($cache_file) + 3600 > time())) {
        $keys = json_decode(file_get_contents($cache_file), true);
    } else {
        try {
            $client = new Client();
            $response = $client->get('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
            $keys = json_decode($response->getBody(), true);
            file_put_contents($cache_file, json_encode($keys));
        } catch (Exception $e) {
            error_log('Failed to fetch Firebase public keys: ' . $e->getMessage());
            return null;
        }
    }

    if (empty($keys)) {
        return null;
    }

    try {
        $keyObjects = [];
        foreach ($keys as $kid => $pem) {
            $keyObjects[$kid] = new Key($pem, 'RS256');
        }

        $decoded = JWT::decode($jwt, $keyObjects);
        
        $now = time();
        if ($decoded->iss !== 'https://securetoken.google.com/' . $project_id ||
            $decoded->aud !== $project_id ||
            $decoded->auth_time > $now) {
            return null;
        }

        return $decoded;

    } catch (Exception $e) {
        return null;
    }
}

function is_admin($conn, $uid) {
    if (!$uid || !$conn) return false;
    $stmt = $conn->prepare("SELECT role FROM users WHERE uid = ?");
    if (!$stmt) return false;
    $stmt->bind_param("s", $uid);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $stmt->close();
    return $user && $user['role'] === 'Admin';
}


// --- AUTH MIDDLEWARE LOGIC ---
if (!isset($firebase_project_id)) {
    send_error('Server configuration error: Firebase Project ID is not set.', 500);
}

$decoded_token = get_decoded_token($firebase_project_id);
$current_user_uid = $decoded_token->user_id ?? ($decoded_token->uid ?? null);
$is_admin_request = $decoded_token ? is_admin($conn, $current_user_uid) : false;

$admin_routes = [
    'categories' => ['POST', 'PUT', 'DELETE'], 
    'post_categories' => ['POST', 'PUT', 'DELETE'],
    'reel_categories' => ['POST', 'PUT', 'DELETE'],    
    'staticPages' => ['POST', 'PUT', 'DELETE'], 
    'reports' => ['PUT', 'DELETE'], 
    'users' => ['DELETE'], 
    'settings' => ['PUT'] 
];

$user_routes = [
    'prompts' => ['POST', 'PUT', 'DELETE'], 
    'posts' => ['POST', 'PUT', 'DELETE'],
    'reels' => ['POST', 'PUT', 'DELETE'], 
    'comments' => ['POST', 'PUT', 'DELETE'],
    'post_comments' => ['POST', 'PUT', 'DELETE'],
    'reel_comments' => ['POST', 'PUT', 'DELETE'],
    'collections' => ['GET', 'POST', 'PUT', 'DELETE'],
    'showcase_images' => ['POST', 'DELETE'],
    'notifications' => ['GET', 'POST', 'DELETE'],
    'favorites' => ['GET', 'POST', 'DELETE'],
    'ratings' => ['POST'],
    'users' => ['POST', 'PUT'],
    'analytics' => ['GET'],
    'sepay' => ['POST'],
    'paypal' => ['POST'],
    'support_tickets' => ['GET', 'POST', 'PUT'],
    'support_messages' => ['GET', 'POST'],
    'rewards' => ['POST']
];

$method = $_SERVER['REQUEST_METHOD'];
$resource = $_GET['resource'] ?? '';

$is_admin_action = isset($admin_routes[$resource]) && in_array($method, $admin_routes[$resource]);

if ($resource === 'reels' && $method === 'POST' && isset($_GET['action']) && in_array($_GET['action'], ['like', 'view'])) {
    $is_admin_action = false; 
}

if ($is_admin_action) {
    if (!$decoded_token) send_error('Authentication required.', 401);
    if (!$is_admin_request) send_error('Administrator access required.', 403);
}

$is_user_action = isset($user_routes[$resource]) && in_array($method, $user_routes[$resource]);

if ($is_user_action) {
    $is_lookup_action = ($resource === 'users' && $method === 'POST' && isset($_GET['action']) && $_GET['action'] === 'lookup_username');
    $is_increment_view_action = (($resource === 'prompts' || $resource === 'posts') && $method === 'POST' && isset($_GET['action']) && $_GET['action'] === 'increment_view');
    $is_ipn_action = ($resource === 'sepay' && isset($_GET['action']) && $_GET['action'] === 'ipn');


    if (!$decoded_token && !$is_lookup_action && !$is_increment_view_action && !$is_ipn_action) {
        if ($method === 'GET') {
            send_json([]);
            exit();
        }
        send_error('Authentication required.', 401);
    }
    if ($decoded_token) {
        $_GET['auth_uid'] = $current_user_uid;
    }
}

if ($resource === 'users' && $method === 'PUT' && isset($_GET['uid'])) {
    if (!$decoded_token) send_error('Authentication required.', 401);
    if (!$is_admin_request && $_GET['uid'] !== $current_user_uid) {
        send_error('Forbidden: You can only update your own profile.', 403);
    }
}


// --- ROUTING ---
$get_params = filter_input_array(INPUT_GET, FILTER_SANITIZE_FULL_SPECIAL_CHARS);

$post_data = null;
if ($resource !== 'upload') { 
    $post_data = json_decode(file_get_contents('php://input'), true);
}

$id = $get_params['id'] ?? null;
$uid = $get_params['uid'] ?? null;

switch ($resource) {
    case 'prompts': require_once 'api/prompts.php'; handle_prompts($conn, $method, $id, $get_params, $post_data); break;
    case 'posts': require_once 'api/posts.php'; handle_posts($conn, $method, $id, $get_params, $post_data); break;
    case 'reels': require_once 'api/reels.php'; handle_reels($conn, $method, $id, $get_params, $post_data); break;
    case 'reel_comments': require_once 'api/reel_comments.php'; handle_reel_comments($conn, $method, $id, $get_params, $post_data); break;
    case 'categories': require_once 'api/categories.php'; handle_categories($conn, $method, $id, $get_params, $post_data); break;
    case 'post_categories': require_once 'api/post_categories.php'; handle_post_categories($conn, $method, $id, $get_params, $post_data); break;
    case 'reel_categories': require_once 'api/reel_categories.php'; handle_reel_categories($conn, $method, $id, $get_params, $post_data); break;
    case 'users': require_once 'api/users.php'; handle_users($conn, $method, $uid, $get_params, $post_data); break;
    case 'comments': require_once 'api/comments.php'; handle_comments($conn, $method, $id, $get_params, $post_data); break;
    case 'post_comments': require_once 'api/post_comments.php'; handle_post_comments($conn, $method, $id, $get_params, $post_data); break;
    case 'reports': require_once 'api/reports.php'; handle_reports($conn, $method, $id, $get_params, $post_data); break;
    case 'staticPages': require_once 'api/static_pages.php'; handle_static_pages($conn, $method, $id, $get_params, $post_data); break;
    case 'collections': require_once 'api/collections.php'; handle_collections($conn, $method, $id, $get_params, $post_data); break;
    case 'showcase_images': require_once 'api/showcase_images.php'; handle_showcase_images($conn, $method, $id, $get_params, $post_data); break;
    case 'social': require_once 'api/social.php'; handle_social($conn, $method, $post_data); break;
    case 'notifications': require_once 'api/notifications.php'; handle_notifications($conn, $method, $id, $get_params, $post_data); break;
    case 'favorites': require_once 'api/favorites.php'; handle_favorites($conn, $method, $get_params, $post_data); break;
    case 'ratings': require_once 'api/ratings.php'; handle_ratings($conn, $method, $get_params, $post_data); break;
    case 'settings': require_once 'api/settings.php'; handle_settings($conn, $method, $get_params, $post_data, $is_admin_request); break;
    case 'upload': require_once 'api/upload.php'; handle_upload($conn); break;
    case 'analytics': require_once 'api/analytics.php'; handle_analytics($conn, $method, $get_params); break;
    case 'sepay': require_once 'api/sepay.php'; handle_sepay($conn, $method, $get_params, $post_data); break;
    case 'paypal': require_once 'api/paypal.php'; handle_paypal($conn, $method, $get_params, $post_data); break;
    case 'recaptcha': require_once 'api/recaptcha.php'; handle_recaptcha($conn, $method, $post_data); break;
    case 'support_tickets': require_once 'api/support.php'; handle_support_tickets($conn, $method, $id, $get_params, $post_data); break;
    case 'support_messages': require_once 'api/support.php'; handle_support_messages($conn, $method, $id, $get_params, $post_data); break;    
    case 'rewards': require_once 'api/rewards.php'; handle_rewards($conn, $method, $get_params, $post_data); break;
    default: send_error('Resource not found.', 404); break;
}

if ($conn) {
    $conn->close();
}
?>