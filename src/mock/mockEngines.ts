import type { SpeechRecognizer, WakeWordDetector } from "../types.js";

/**
 * Stand-ins for the real Edge Impulse (wake word) and Vosk (STT) WASM
 * engines. `web/` uses these until the real builds are dropped in — see
 * README.md for what to replace and where.
 */
export class MockWakeWordDetector implements WakeWordDetector {
  private timer: ReturnType<typeof setInterval> | null = null;

  start(_stream: MediaStream, onDetected: () => void): void {
    this.timer = setInterval(onDetected, 4000);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

export class MockSpeechRecognizer implements SpeechRecognizer {
  private timer: ReturnType<typeof setTimeout> | null = null;

  start(_stream: MediaStream, onPartial: (text: string) => void, onFinal: (text: string) => void): void {
    const phrase = "qual a bateria";
    onPartial(phrase.slice(0, phrase.length / 2));
    this.timer = setTimeout(() => onFinal(phrase), 800);
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
