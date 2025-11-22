
export async function onRequest(context) {
  const url = new URL(context.request.url);
  
  // Cấu hình địa chỉ backend thực tế
  // Dựa trên context cũ, backend của bạn là file api.php xử lý qua query param (?resource=...)
  const backendUrl = "https://api.prompthub.today/api.php";
  
  // Ghép URL đích với query string từ request ban đầu (vd: ?resource=settings&uid=...)
  const targetUrl = backendUrl + url.search;

  // Tạo request mới để chuyển tiếp (giữ nguyên method, headers, body)
  const proxyRequest = new Request(targetUrl, context.request);

  // (Tùy chọn) Đôi khi cần set lại Host header nếu server backend chặn request từ domain lạ
  // proxyRequest.headers.set('Host', 'api.prompthub.today');

  try {
    return await fetch(proxyRequest);
  } catch (e) {
    return new Response(JSON.stringify({ error: "Proxy Error: " + e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
