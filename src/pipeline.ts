import { matchIntent } from "./commands.js";
import type { ClassScore, Intent, Language, PipelineState, SpeechRecognizer, WakeWordDetector } from "./types.js";

const LISTEN_WINDOW_MS = 4000;
const SPEECH_GRACE_MS = 700;
const EXTENSION_CHECK_MS = 300;
const MAX_LISTEN_MS = 7500;

export class ZeniraPipeline {
  private state: PipelineState = { status: "idle" };
  private stream: MediaStream | null = null;
  private lastResult: { transcript: string; intent: Intent } | undefined;
  private readonly listeners = new Set<(state: PipelineState) => void>();
  private readonly errorListeners = new Set<(error: unknown) => void>();
  private listenTimer: ReturnType<typeof setTimeout> | null = null;
  private listenStartedAt = 0;
  private lastPartialAt = 0;
  private lastPartialText = "";
  private gotResultThisSession = false;
  private listenSession = 0;

  constructor(
    private readonly wakeWord: WakeWordDetector,
    private readonly recognizer: SpeechRecognizer,
    private readonly language: Language,
  ) {}

  onStateChange(listener: (state: PipelineState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onError(listener: (error: unknown) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  getState(): PipelineState {
    return this.state;
  }

  arm(stream: MediaStream): void {
    this.stream = stream;
    this.lastResult = undefined;
    this.setState({ status: "armed" });
    this.startWakeWordDetection(stream);
  }

  triggerWakeWord(): void {
    if (this.state.status === "armed") this.startListening();
  }

  disarm(): void {
    this.listenSession++;
    this.clearListenTimer();
    this.wakeWord.stop();
    this.recognizer.stop();
    this.stream = null;
    this.lastResult = undefined;
    this.setState({ status: "idle" });
  }

  private startWakeWordDetection(stream: MediaStream): void {
    this.wakeWord.start(
      stream,
      () => this.startListening(),
      (scores) => this.onWakeWordScores(scores),
      (error) => this.emitError(error),
    );
  }

  private emitError(error: unknown): void {
    for (const listener of this.errorListeners) listener(error);
  }

  private onWakeWordScores(scores: ClassScore[]): void {
    if (this.state.status === "armed") {
      this.setState({ status: "armed", wakeWordScores: scores, lastResult: this.lastResult });
    }
  }

  private startListening(): void {
    if (!this.stream) return;
    this.wakeWord.stop();
    this.lastPartialText = "";
    this.lastPartialAt = 0;
    this.listenStartedAt = Date.now();
    this.gotResultThisSession = false;
    const session = ++this.listenSession;
    this.setState({ status: "listening", partialTranscript: "", lastResult: this.lastResult });
    this.recognizer.start(
      this.stream,
      (partial) => {
        if (session !== this.listenSession) return;
        if (partial && partial !== this.lastPartialText) {
          this.lastPartialText = partial;
          this.lastPartialAt = Date.now();
        }
        this.setState({ status: "listening", partialTranscript: partial, lastResult: this.lastResult });
      },
      (final) => {
        if (session !== this.listenSession) return;
        this.gotResultThisSession = true;
        this.lastResult = { transcript: final, intent: matchIntent(final, this.language) };
        this.setState({ status: "listening", partialTranscript: "", lastResult: this.lastResult });
      },
      (error) => this.emitError(error),
    );
    this.scheduleListenCheck(LISTEN_WINDOW_MS);
  }

  private scheduleListenCheck(delay: number): void {
    this.clearListenTimer();
    this.listenTimer = setTimeout(() => this.checkListenWindow(), delay);
  }

  private checkListenWindow(): void {
    if (this.state.status !== "listening") return;

    const now = Date.now();
    const stillSpeaking = now - this.lastPartialAt < SPEECH_GRACE_MS;
    const elapsed = now - this.listenStartedAt;

    if (stillSpeaking && elapsed < MAX_LISTEN_MS) {
      this.scheduleListenCheck(EXTENSION_CHECK_MS);
      return;
    }

    this.finishListening();
  }

  private finishListening(): void {
    this.listenSession++;
    this.clearListenTimer();
    this.recognizer.stop();

    if (!this.stream) return;
    if (!this.gotResultThisSession) {
      const transcript = this.lastPartialText;
      this.lastResult = { transcript, intent: matchIntent(transcript, this.language) };
    }

    this.setState({ status: "armed", lastResult: this.lastResult });
    this.startWakeWordDetection(this.stream);
  }

  private clearListenTimer(): void {
    if (this.listenTimer) {
      clearTimeout(this.listenTimer);
      this.listenTimer = null;
    }
  }

  private setState(state: PipelineState): void {
    this.state = state;
    for (const listener of this.listeners) listener(state);
  }
}
