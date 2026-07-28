import type { SpeechRecognizer } from "../../../src/types.ts";

/**
 * Real speech-to-text engine, backed by Vosk running in the browser via
 * vosk-browser (Apache-2.0, WASM build of Vosk). NOT wired in yet — steps
 * to finish this:
 *
 * 1. `npm install vosk-browser` in `web/`.
 * 2. Download the small model (~40MB, good enough for short commands and
 *    small enough to ship over the network) from
 *    https://alphacephei.com/vosk/models — e.g. `vosk-model-small-pt-0.3`
 *    for Portuguese. Unzip it into `web/public/models/vosk-small/`.
 * 3. Replace the body of `start()` below with vosk-browser's model loader
 *    (`createModel("/models/vosk-small")`) and a recognizer fed by a
 *    `MediaStreamAudioSourceNode` from `stream`; forward its `partialresult`
 *    / `result` worker messages to `onPartial` / `onFinal`.
 * 4. Flip `usingRealEngines` in `./index.ts` to `true`.
 *
 * Note: the large/full Vosk models (~1.8GB) aren't practical to ship to a
 * browser — if higher accuracy than the small model is needed, that has to
 * run server-side behind a small API instead of in-browser.
 */
export class VoskSpeechRecognizer implements SpeechRecognizer {
  start(_stream: MediaStream, _onPartial: (text: string) => void, _onFinal: (text: string) => void): void {
    throw new Error("VoskSpeechRecognizer not wired in yet — see comments in this file.");
  }

  stop(): void {
    // no-op until start() is implemented
  }
}
