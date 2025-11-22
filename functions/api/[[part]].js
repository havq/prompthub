// /functions/api/v1/[[path]].js

/**
 * Tên domain API gốc của bạn trên VPS. 
 * Thay thế bằng domain thực tế (ví dụ: "https://my-api-server.com")
 */
const API_ORIGIN = "https://api.prompthub.today";

/**
 * Hàm chính để xử lý mọi yêu cầu đến endpoint này.
 * @param {EventContext} context - Đối tượng ngữ cảnh được cung cấp bởi Cloudflare.
 */
export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);

    // 1. Xây dựng URL API đích trên VPS:
    // Tách phần /api/v1/ ra và giữ lại phần path còn lại
    // Ví dụ: /api/v1/users/123 -> /users/123
    const apiPath = url.pathname.replace('/api', '');
    
    // Kết hợp với domain gốc và các tham số truy vấn (query params)
    const targetUrl = `${API_ORIGIN}${apiPath}${url.search}`;

    // 2. Clone request để tránh lỗi (vì request chỉ có thể được đọc một lần)
    const newRequest = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        // Đảm bảo không cache ở chế độ này, trừ khi bạn có ý định
        cache: 'no-store' 
    });

    try {
        // 3. Chuyển tiếp (proxy) request đến API gốc trên VPS
        const response = await fetch(newRequest);

        // 4. (Tùy chọn) Xử lý CORS và các Header khác:
        // Vì Pages Functions chạy trên domain Pages của bạn,
        // bạn không cần lo lắng về CORS từ Frontend React đến Functions.
        // Tuy nhiên, bạn có thể cần điều chỉnh header Response.
        const newResponse = new Response(response.body, response);
        
        // Vô hiệu hóa một số Header bảo mật không cần thiết từ API gốc (tùy chọn)
        newResponse.headers.delete('X-Powered-By'); 

        return newResponse;

    } catch (error) {
        // Xử lý lỗi nếu API gốc không phản hồi
        return new Response(`Proxy Error: ${error.message}`, { status: 500 });
    }
}