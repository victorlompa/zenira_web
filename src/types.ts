/**
 * Pluggable interfaces for the two ML engines the real Zenira pipeline
 * (MCV25) runs on Raspberry Pi with Edge Impulse + Vosk. The browser demo
 * implements these same interfaces with real WASM builds; tests and local
 * dev use the mocks in `src/mock/`.
 */

export interface WakeWordDetector {
  /** Starts listening on the given audio stream and fires onDetected each time the wake word is heard. */
  start(stream: MediaStream, onDetected: () => void): void;
  stop(): void;
}

export interface SpeechRecognizer {
  /** Starts a single transcription pass on the given audio stream. */
  start(stream: MediaStream, onPartial: (text: string) => void, onFinal: (text: string) => void): void;
  stop(): void;
}

export type PipelineState =
  | { status: "idle" }
  | { status: "armed" }
  | { status: "listening"; partialTranscript: string }
  | { status: "command"; transcript: string; intent: Intent };

export interface Intent {
  name: string;
  confidence: number;
}
