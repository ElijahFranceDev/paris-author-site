// Bridge the existing, authenticated bookstore handlers to Netlify's modern
// Request/Response API so the Blobs SDK receives its runtime context automatically.
export async function toLegacyEvent(request) {
  const url = new URL(request.url);
  const headers = Object.fromEntries(request.headers);
  if (!headers.host) headers.host = url.host;
  return {
    httpMethod: request.method,
    headers,
    queryStringParameters: Object.fromEntries(url.searchParams),
    body: request.method === "GET" || request.method === "HEAD" ? null : await request.text()
  };
}
export function fromLegacyResponse(result) {
  const data = result || {statusCode:500,body:"Function did not return a response"};
  const body = data.isBase64Encoded
    ? Buffer.from(data.body || "", "base64")
    : (typeof data.body === "string" ? data.body : "");
  return new Response(body, {status:data.statusCode||200, headers:data.headers||{}});
}
