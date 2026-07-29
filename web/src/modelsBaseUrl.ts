/**
 * Where the Vosk (.tar.gz) and Edge Impulse (.js/.wasm) model files are
 * served from. Locally that's `web/public/models/` itself — gitignored,
 * since they're 30-70MB each and don't belong in the repo.
 *
 * In a production build, defaults to `/api/models` — the Edge Function at
 * `api/models/[...path].js` that fetches a GitHub Release and streams it
 * back same-origin (needed under this site's Cross-Origin-Embedder-Policy;
 * see the Deploy section of README.md). This points at that function
 * directly rather than going through the `/models` rewrite in
 * `vercel.json` — that rewrite proved unreliable in practice, so the app
 * no longer depends on it working; it's kept only as a convenience alias.
 *
 * Set `VITE_MODELS_BASE_URL` (a Vercel project env var) to override this —
 * e.g. if the models end up hosted somewhere else entirely. All five files
 * (`vosk-model-small-pt-0.3.tar.gz`, `vosk-model-small-en-us-0.15.tar.gz`,
 * `edge-impulse-standalone.js`, `edge-impulse-standalone.wasm`,
 * `run-impulse.js`) must sit flat under that same base, exactly as they do
 * in `web/public/models/`.
 */
export const MODELS_BASE_URL =
  (import.meta.env.VITE_MODELS_BASE_URL as string | undefined) || (import.meta.env.PROD ? "/api/models" : "/models");
