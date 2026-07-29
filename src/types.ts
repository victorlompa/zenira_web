/**
 * Pluggable interfaces for the two ML engines the real Zenira pipeline
 * (MCV25) runs on Raspberry Pi with Edge Impulse + Vosk. The browser demo
 * implements these same interfaces with real WASM builds; tests and local
 * dev use the mocks in `src/mock/`.
 */

/** Per-class confidence from the wake-word classifier, e.g. { label: "Zenira", value: 0.83 }. */
export interface ClassScore {
  label: string;
  value: number;
}

export interface WakeWordDetector {
  /**
   * Starts listening on the given audio stream and fires onDetected each
   * time the wake word is heard. `onScores`, if provided, is called with
   * every classification pass (all classes, not just the wake word) so a
   * UI can show live confidence — implementations without real per-class
   * scores (e.g. mocks) may simply never call it.
   */
  start(
    stream: MediaStream,
    onDetected: () => void,
    onScores?: (scores: ClassScore[]) => void,
    onError?: (error: unknown) => void,
  ): void;
  stop(): void;
}

export interface SpeechRecognizer {
  /** Starts a single transcription pass on the given audio stream. */
  start(
    stream: MediaStream,
    onPartial: (text: string) => void,
    onFinal: (text: string) => void,
    onError?: (error: unknown) => void,
  ): void;
  stop(): void;
}

/** Languages the demo can transcribe speech in. */
export type Language = "pt" | "en";

/**
 * `lastResult` is carried on both "armed" and "listening" (not just
 * "listening") and never cleared until a new one replaces it — so the last
 * command's outcome (recognized or not) stays visible across the
 * listening -> armed transition instead of disappearing the instant a
 * session ends. Also avoids a React batching trap: setting it and then
 * immediately changing `status` in the same synchronous call would
 * otherwise coalesce into one render that only reflects the final status,
 * silently dropping the intermediate value from the state consumers see.
 */
export type PipelineState =
  | { status: "idle" }
  | { status: "armed"; wakeWordScores?: ClassScore[]; lastResult?: { transcript: string; intent: Intent } }
  | { status: "listening"; partialTranscript: string; lastResult?: { transcript: string; intent: Intent } };

export interface Intent {
  name: string;
  confidence: number;
}
