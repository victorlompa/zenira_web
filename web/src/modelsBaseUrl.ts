/**
 * Where the Vosk (.tar.gz) and Edge Impulse (.js/.wasm) model files are
 * served from. Locally (and by default) that's `web/public/models/` itself
 * — gitignored, since they're 30-70MB each and don't belong in the repo.
 *
 * For a deployed build, set `VITE_MODELS_BASE_URL` (a Vercel project env
 * var) to wherever those same files were uploaded — e.g. a GitHub Release's
 * asset base URL — so the build doesn't need them checked into git at all.
 * All five files (`vosk-model-small-pt-0.3.tar.gz`,
 * `vosk-model-small-en-us-0.15.tar.gz`, `edge-impulse-standalone.js`,
 * `edge-impulse-standalone.wasm`, `run-impulse.js`) must sit flat under
 * that same base, exactly as they do in `web/public/models/`.
 */
export const MODELS_BASE_URL = (import.meta.env.VITE_MODELS_BASE_URL as string | undefined) || "/models";
