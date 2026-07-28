import { matchIntent } from "./commands.js";
import type { PipelineState, SpeechRecognizer, WakeWordDetector } from "./types.js";

/**
 * State machine: idle -> armed (wake word detector running) -> listening
 * (STT running after wake word fires) -> command (intent parsed) -> armed.
 * Framework-free so it can run identically in Node (tests) or the browser.
 */
export class ZeniraPipeline {
  private state: PipelineState = { status: "idle" };
  private readonly listeners = new Set<(state: PipelineState) => void>();

  constructor(
    private readonly wakeWord: WakeWordDetector,
    private readonly recognizer: SpeechRecognizer,
  ) {}

  onStateChange(listener: (state: PipelineState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getState(): PipelineState {
    return this.state;
  }

  arm(stream: MediaStream): void {
    this.setState({ status: "armed" });
    this.wakeWord.start(stream, () => this.onWakeWordDetected(stream));
  }

  disarm(): void {
    this.wakeWord.stop();
    this.recognizer.stop();
    this.setState({ status: "idle" });
  }

  private onWakeWordDetected(stream: MediaStream): void {
    this.setState({ status: "listening", partialTranscript: "" });
    this.recognizer.start(
      stream,
      (partial) => this.setState({ status: "listening", partialTranscript: partial }),
      (final) => this.onTranscriptFinal(stream, final),
    );
  }

  private onTranscriptFinal(stream: MediaStream, transcript: string): void {
    const intent = matchIntent(transcript);
    this.setState({ status: "command", transcript, intent });
    // back to armed so the demo keeps listening for the next wake word
    this.wakeWord.start(stream, () => this.onWakeWordDetected(stream));
  }

  private setState(state: PipelineState): void {
    this.state = state;
    for (const listener of this.listeners) listener(state);
  }
}
