import type { WakeWordDetector } from "../../../src/types.ts";

/**
 * Real wake-word engine, backed by the Edge Impulse model trained for
 * MCV25/Zenira. NOT wired in yet — steps to finish this:
 *
 * 1. In Edge Impulse Studio, open the impulse and go to Deployment.
 * 2. Pick target "WebAssembly" and build. That downloads a .zip containing
 *    an `edge-impulse-standalone.js` + `.wasm` pair (the exact filenames
 *    depend on your project name).
 * 3. Drop those two files in `web/public/models/` (create the folder) so
 *    Vite serves them as static assets.
 * 4. Replace the body of `start()` below: load the WASM module, feed it
 *    audio frames from `stream` via a Web Audio `AudioWorkletNode` (Edge
 *    Impulse's own WASM examples show the exact framing/buffer size the
 *    model expects), and call `onDetected()` when the classifier's output
 *    score for the wake-word label crosses your chosen threshold.
 * 5. Flip `usingRealEngines` in `./index.ts` to `true`.
 */
export class EdgeImpulseWakeWordDetector implements WakeWordDetector {
  start(_stream: MediaStream, _onDetected: () => void): void {
    throw new Error("EdgeImpulseWakeWordDetector not wired in yet — see comments in this file.");
  }

  stop(): void {
    // no-op until start() is implemented
  }
}
