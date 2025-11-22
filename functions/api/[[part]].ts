
interface Env {
  REAL_API_URL: string; // The actual URL of your PHP backend (e.g., https://my-vps.com/prompthub/api.php)
}

// Define PagesFunction locally to avoid type errors if global types are missing
type PagesFunction<E> = (context: { request: Request; env: E; [key: string]: any }) => Promise<Response>;

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // 1. Validate configuration
  if (!env.REAL_API_URL) {
    return new Response(JSON.stringify({ error: "REAL_API_URL environment variable is not set in Cloudflare Pages." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Construct the target URL
  // The frontend calls: /api?resource=prompts...
  // We want to forward to: https://my-php-server.com/api.php?resource=prompts...
  
  // Remove '/api' prefix from pathname if strictly mapping /api -> api.php
  // However, based on your current architecture, your frontend sends query params to a single entry point.
  // We will append the query string from the incoming request to the REAL_API_URL.
  
  const targetUrl = new URL(env.REAL_API_URL);
  targetUrl.search = url.search; // Pass through ?resource=...&action=...

  // 3. Create a new request to forward
  // We must recreate the request because the original request object is immutable in some props
  const proxyRequest = new Request(targetUrl.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: "follow",
  });

  // Adjust headers for the upstream server
  // Ideally, host header should be handled by fetch, but we might need to remove CF specific ones if upstream rejects them
  // For simple PHP hosting, simply forwarding usually works.
  
  try {
    // 4. Fetch from the PHP backend
    const response = await fetch(proxyRequest);

    // 5. Return the response to the frontend
    // We create a new response to ensure headers are mutable if needed (e.g. CORS adjustment)
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

    // Ensure CORS allows the Cloudflare domain (should be automatic since it's same-origin proxy)
    // But strict backends might need these stripped or modified. 
    // Usually, simply returning the response works for a proxy.
    
    return newResponse;

  } catch (err: any) {
    return new Response(JSON.stringify({ error: "Proxy Error: Failed to connect to backend.", details: err.message }), {
      status: 502, // Bad Gateway
      headers: { "Content-Type": "application/json" },
    });
  }
};
