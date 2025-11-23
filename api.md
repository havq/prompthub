
<?php
// api.php

error_reporting(0);

// --- SECURE SESSION COOKIE CONFIGURATION ---
ini_set('session.cookie_secure', 1); 
ini_set('session.cookie_httponly', 1); 
ini_set('session.cookie_samesite', 'None'); 

// --- CONFIGURATION ---
// REPLACE THIS WITH A STRONG RANDOM STRING IN PRODUCTION!
define('JWT_SECRET_KEY', 'v2_Q8pYwE$kLzT2vG@hB7xN9rC5sD0fJ4mX!yA3uI6oP1eR');

// --- AUTHORIZATION HEADER FIX ---
// Updated logic to handle various server configurations (Apache, Nginx, FastCGI)
// This block attempts to recover Authorization header if it was stripped by the web server
if (!isset($_SERVER['HTTP_AUTHORIZATION'])) {
    if (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $_SERVER['HTTP_AUTHORIZATION'] = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['Authorization'])) {
        $_SERVER['HTTP_AUTHORIZATION'] = $_SERVER['Authorization'];
    } elseif (function_exists('apache_request_headers')) {
        $requestHeaders = apache_request_headers();
        $requestHeaders = array_combine(array_map('ucwords', array_map('strtolower', array_keys($requestHeaders))), array_values($requestHeaders));
        if (isset($requestHeaders['Authorization'])) {
            $_SERVER['HTTP_AUTHORIZATION'] = $requestHeaders['Authorization'];
        }
    }
}

header("Access-Control-Allow-Origin: *"); 
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
    $redis->connect('127.0.0.1', 6379);
    // $redis->auth('password'); // Uncomment if needed
} catch (RedisException $e) {
    error_log('Could not connect to Redis: ' . $e->getMessage());
    $redis = null;
}

// --- HELPER FUNCTIONS ---
function send_json($data) {
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);
    exit();
}

function send_error($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['error' => $message]);
    exit();
}

// --- CUSTOM JWT AUTHENTICATION FUNCTIONS ---
function verify_jwt_token($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    list($base64UrlHeader, $base64UrlPayload, $base64UrlSignature) = $parts;

    // Verify Signature
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, JWT_SECRET_KEY, true);
    $base64UrlSignatureExpected = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

    if (!hash_equals($base64UrlSignatureExpected, $base64UrlSignature)) {
        return null;
    }

    $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $base64UrlPayload)), true);
    
    if (!$payload || !isset($payload['exp']) || $payload['exp'] < time()) {
        return null;
    }

    return $payload;
}

function get_decoded_token() {
    if (!isset($_SERVER['HTTP_AUTHORIZATION'])) {
        return null;
    }
    $auth_header = $_SERVER['HTTP_AUTHORIZATION'];
    if (!preg_match('/Bearer\s(\S+)/', $auth_header, $matches)) {
        return null;
    }
    $jwt = $matches[1];
    return verify_jwt_token($jwt);
}

// --- AUTH MIDDLEWARE LOGIC ---
$decoded_token = get_decoded_token();
$current_user_uid = $decoded_token['uid'] ?? null;
// Trust the token's claim for admin to avoid DB lookup on every request, 
// or implement is_admin() DB check for higher security.
$is_admin_request = isset($decoded_token['is_admin']) && $decoded_token['is_admin'] === true;

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

// Special case: Auth Resource
if ($resource === 'auth') {
    require_once 'api/auth.php';
    try {
        // Ensure we pass an array even if input is empty (for GET requests)
        $input = file_get_contents('php://input');
        $decoded = $input ? json_decode($input, true) : [];
        handle_auth($conn, $method, $decoded ?: []);
    } catch (Throwable $e) {
        send_error('Auth Error: ' . $e->getMessage(), 500);
    }
    exit();
}

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
if ($resource !== 'upload' && $resource !== 'auth') { 
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
