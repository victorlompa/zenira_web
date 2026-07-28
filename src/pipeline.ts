import { matchIntent } from "./commands.js";
import type { ClassScore, Intent, Language, PipelineState, SpeechRecognizer, WakeWordDetector } from "./types.js";

// How long a "listening" session lasts after the wake word fires. If the
// user is still mid-word right at the deadline (a partial result changed
// very recently), the window is extended in short increments — checked
// against a quiet period, not real voice-activity detection — until either
// they pause or MAX_LISTEN_MS is hit, whichever comes first.
const LISTEN_WINDOW_MS = 3000;
const SPEECH_GRACE_MS = 700;
const EXTENSION_CHECK_MS = 300;
const MAX_LISTEN_MS = 7000;

/**
 * State machine: idle -> armed (wake word detector running, reporting live
 * per-class scores as it listens) -> listening (STT running for a bounded
 * window after the wake word fires — automatically or via
 * `triggerWakeWord` — matching a fresh intent from each final result) ->
 * armed again once the window closes, ready for the next wake word -> idle
 * on disarm. Framework-free so it can run identically in Node (tests) or
 * the browser.
 */
export class ZeniraPipeline {
  private state: PipelineState = { status: "idle" };
  private stream: MediaStream | null = null;
  private lastResult: { transcript: string; intent: Intent } | undefined;
  private readonly listeners = new Set<(state: PipelineState) => void>();
  private listenTimer: ReturnType<typeof setTimeout> | null = null;
  private listenStartedAt = 0;
  private lastPartialAt = 0;
  private lastPartialText = "";
  // Bumped on every startListening() call; captured by that session's
  // recognizer callbacks so a stale partial/final arriving after the
  // session already finished (stop() doesn't guarantee no in-flight
  // events) can't resurrect "listening" once we've moved on.
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

  getState(): PipelineState {
    return this.state;
  }

  arm(stream: MediaStream): void {
    this.stream = stream;
    this.lastResult = undefined;
    this.setState({ status: "armed" });
    this.startWakeWordDetection(stream);
  }

  /** Also lets the UI (or a test) fire the wake word without waiting for the detector. */
  triggerWakeWord(): void {
    if (this.state.status === "armed") this.startListening();
  }

  disarm(): void {
    this.listenSession++; // invalidate any in-flight callbacks from the current session
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
    );
  }

  private onWakeWordScores(scores: ClassScore[]): void {
    if (this.state.status === "armed") this.setState({ status: "armed", wakeWordScores: scores });
  }

  private startListening(): void {
    if (!this.stream) return;
    this.wakeWord.stop();
    this.lastResult = undefined;
    this.lastPartialText = "";
    this.lastPartialAt = 0;
    this.listenStartedAt = Date.now();
    const session = ++this.listenSession;
    this.setState({ status: "listening", partialTranscript: "" });
    this.recognizer.start(
      this.stream,
      (partial) => {
        if (session !== this.listenSession) return; // stale event from a session that already finished
        if (partial && partial !== this.lastPartialText) {
          this.lastPartialText = partial;
          this.lastPartialAt = Date.now();
        }
        this.setState({ status: "listening", partialTranscript: partial, lastResult: this.lastResult });
      },
      (final) => {
        if (session !== this.listenSession) return; // stale event from a session that already finished
        this.lastResult = { transcript: final, intent: matchIntent(final, this.language) };
        this.setState({ status: "listening", partialTranscript: "", lastResult: this.lastResult });
      },
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
    this.listenSession++; // invalidate any in-flight callbacks from the session that just ended
    this.clearListenTimer();
    this.recognizer.stop();
    if (!this.stream) return;
    this.setState({ status: "armed" });
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
