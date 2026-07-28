import { matchIntent } from "./commands.js";
import type { ClassScore, Intent, PipelineState, SpeechRecognizer, WakeWordDetector } from "./types.js";

/**
 * State machine: idle -> armed (wake word detector running, reporting live
 * per-class scores as it listens) -> listening (STT running continuously
 * once the wake word fires — automatically or via `triggerWakeWord`,
 * matching a fresh intent each time it hears a final result) -> idle again
 * on disarm. Framework-free so it can run identically in Node (tests) or
 * the browser.
 */
export class ZeniraPipeline {
  private state: PipelineState = { status: "idle" };
  private stream: MediaStream | null = null;
  private lastResult: { transcript: string; intent: Intent } | undefined;
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
    this.stream = stream;
    this.lastResult = undefined;
    this.setState({ status: "armed" });
    this.wakeWord.start(
      stream,
      () => this.startListening(),
      (scores) => this.onWakeWordScores(scores),
    );
  }

  /** Also lets the UI (or a test) fire the wake word without waiting for the detector. */
  triggerWakeWord(): void {
    if (this.state.status === "armed") this.startListening();
  }

  disarm(): void {
    this.wakeWord.stop();
    this.recognizer.stop();
    this.stream = null;
    this.lastResult = undefined;
    this.setState({ status: "idle" });
  }

  private onWakeWordScores(scores: ClassScore[]): void {
    if (this.state.status === "armed") this.setState({ status: "armed", wakeWordScores: scores });
  }

  private startListening(): void {
    if (!this.stream) return;
    this.wakeWord.stop();
    this.lastResult = undefined;
    this.setState({ status: "listening", partialTranscript: "" });
    this.recognizer.start(
      this.stream,
      (partial) => this.setState({ status: "listening", partialTranscript: partial, lastResult: this.lastResult }),
      (final) => {
        this.lastResult = { transcript: final, intent: matchIntent(final) };
        this.setState({ status: "listening", partialTranscript: "", lastResult: this.lastResult });
      },
    );
  }

  private setState(state: PipelineState): void {
    this.state = state;
    for (const listener of this.listeners) listener(state);
  }
}
