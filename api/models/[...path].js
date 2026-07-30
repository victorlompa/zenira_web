export const config = { runtime: "edge" };

const RELEASE_BASE = "https://github.com/victorlompa/zenira_web/releases/download/models-v1";

const SAFE_FILENAME = /^[A-Za-z0-9._-]+$/;

export default async function handler(request) {
  const url = new URL(request.url);
  const filename = url.pathname.replace(/^\/api\/models\//, "");

  if (!SAFE_FILENAME.test(filename)) {
    return new Response("Not found", { status: 404 });
  }

  const upstream = await fetch(`${RELEASE_BASE}/${filename}`, { redirect: "follow" });
  if (!upstream.ok || !upstream.body) {
    return new Response("Not found", { status: upstream.status === 200 ? 502 : upstream.status });
  }

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  const contentLength = upstream.headers.get("content-length");
  if (contentType) headers.set("Content-Type", contentType);
  if (contentLength) headers.set("Content-Length", contentLength);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new Response(upstream.body, { status: 200, headers });
}
