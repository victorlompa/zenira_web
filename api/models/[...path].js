// Streams the Vosk/Edge Impulse model files from a GitHub Release, same-origin.
//
// Why this exists instead of a plain vercel.json rewrite to the GitHub URL
// directly: this site sets Cross-Origin-Embedder-Policy: require-corp (Vosk's
// WASM build needs cross-origin isolation), which makes the browser block any
// cross-origin subresource that doesn't send a Cross-Origin-Resource-Policy
// header — and GitHub's release-asset CDN sends neither that nor CORS
// headers. A rewrite alone doesn't fix this either: GitHub's download URL
// itself 302s to Azure Blob Storage, and Vercel's external-URL rewrite
// forwards that redirect to the browser rather than resolving it, so the
// browser ends up following the redirect itself — right back to a
// cross-origin, COEP-blocked URL. Fetching here, server-side, resolves that
// redirect before the browser ever sees it, so the response streamed back is
// genuinely same-origin.
export const config = { runtime: "edge" };

const RELEASE_BASE = "https://github.com/victorlompa/zenira_web/releases/download/models-v1";

// Model filenames only — no slashes, no "..". Keeps this from doubling as an
// open proxy for arbitrary github.com paths.
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
  // Releases are immutable once published (see README) — a new model
  // version means a new tag, so caching this hard is safe.
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new Response(upstream.body, { status: 200, headers });
}
