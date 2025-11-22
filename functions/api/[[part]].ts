// /functions/api/v1/[[path]].js

/**
 * Tên domain API gốc của bạn trên VPS. 
 * Thay thế bằng domain thực tế
 */
const API_ORIGIN = "https://api.prompthub.today";

/**
 * Hàm chính để xử lý mọi yêu cầu đến endpoint này.
 * @param {EventContext} context - Đối tượng ngữ cảnh được cung cấp bởi Cloudflare.
 */
export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);

    // API PHP của bạn sử dụng entry point là api.php
    // Vì vậy ta cần trỏ thẳng vào file này kèm theo query string
    const targetUrl = `${API_ORIGIN}/api.php${url.search}`;

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
        const newResponse = new Response(response.body, response);
        
        // Vô hiệu hóa một số Header bảo mật không cần thiết từ API gốc (tùy chọn)
        newResponse.headers.delete('X-Powered-By'); 

        return newResponse;

    } catch (error) {
        // Xử lý lỗi nếu API gốc không phản hồi
        return new Response(`Proxy Error: ${error.message}`, { status: 500 });
    }
}