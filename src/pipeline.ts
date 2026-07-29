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
  private readonly errorListeners = new Set<(error: unknown) => void>();
  private listenTimer: ReturnType<typeof setTimeout> | null = null;
  private listenStartedAt = 0;
  private lastPartialAt = 0;
  private lastPartialText = "";
  // Whether a real final result (matched or not) has arrived during the
  // *current* listening session — distinct from `lastResult` itself, which
  // is deliberately never cleared between sessions (so the Output card
  // keeps showing the last known outcome). Using `!lastResult` as the "did
  // anything happen this session" signal would only work the very first
  // time: after the first silent session synthesizes a fallback result,
  // lastResult is never falsy again, so every silent session after that
  // would go undetected.
  private gotResultThisSession = false;
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

  /** Fires when the wake-word detector or speech recognizer fails to start (e.g. a model failed to load). */
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
    // Deliberately keeps the previous lastResult rather than clearing it —
    // the Output card should keep showing the last known outcome (whatever
    // it was) until a new one actually replaces it, not go blank the
    // instant a fresh listening session begins.
    this.setState({ status: "listening", partialTranscript: "", lastResult: this.lastResult });
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
    this.listenSession++; // invalidate any in-flight callbacks from the session that just ended
    this.clearListenTimer();
    this.recognizer.stop();
    if (!this.stream) return;

    // No final result ever arrived this session — e.g. the speaker paused
    // too long, said something outside the constrained vocabulary, or
    // nothing crossed Vosk's endpointing threshold at all. Surface that as
    // an explicit new "not recognized" result every time it happens, not
    // just the first — see `gotResultThisSession` above for why this can't
    // just check `!this.lastResult`. Falls back to the last partial Vosk
    // reported (rather than an empty string) so the history/Output card
    // shows what Vosk actually heard instead of a blank "".
    if (!this.gotResultThisSession) {
      const transcript = this.lastPartialText;
      this.lastResult = { transcript, intent: matchIntent(transcript, this.language) };
    }

    // A single setState call, carrying lastResult straight into the "armed"
    // state — not two calls (one "listening" with the result, then
    // "armed"). React batches same-tick setState calls together and only
    // commits the final one, so a two-step version would silently drop the
    // intermediate result before any consumer ever saw it.
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
