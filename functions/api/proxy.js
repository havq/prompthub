    // _functions/api/proxy.js
    export async function onRequest({ request }) {
      const url = new URL(request.url);
      const targetUrl = `https://api.prompthub.today${url.pathname}${url.search}`; // Construct the target URL

      const response = await fetch(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body, // Include body for POST, PUT requests
      });

      return response;
    }
