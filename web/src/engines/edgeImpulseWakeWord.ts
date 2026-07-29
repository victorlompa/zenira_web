import type { ClassScore, WakeWordDetector } from "../../../src/types.ts";
import { getSharedAudioSource } from "../audioGraph.ts";
import { createEdgeImpulseClassifier, type EdgeImpulseClassifierInstance } from "./edgeImpulseClassifier.ts";

// From the MCV25 impulse's deployment-metadata.json: 16kHz mono mic input,
// a 1000ms sliding window advancing 500ms at a time (so classifyContinuous
// gets fed in 500ms/8000-sample hops), 3 classes, and the learn block's own
// confidence threshold.
const HOP_SAMPLES = 8000;
const WAKE_LABEL = "Zenira";
const CONFIDENCE_THRESHOLD = 0.5;

/**
 * Real wake-word engine, backed by the Edge Impulse model trained for
 * MCV25/Zenira (WASM export served from `MODELS_BASE_URL`, see
 * `edgeImpulseClassifier.ts` and `../modelsBaseUrl.ts`).
 */
export class EdgeImpulseWakeWordDetector implements WakeWordDetector {
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private silence: GainNode | null = null;
  private buffer: number[] = [];
  private triggered = false;
  private stopped = false;

  start(stream: MediaStream, onDetected: () => void, onScores?: (scores: ClassScore[]) => void): void {
    this.stopped = false;
    void this.startAsync(stream, onDetected, onScores);
  }

  private async startAsync(
    stream: MediaStream,
    onDetected: () => void,
    onScores?: (scores: ClassScore[]) => void,
  ): Promise<void> {
    console.info("Zenira: loading Edge Impulse classifier…");
    const classifier = await createEdgeImpulseClassifier();
    console.info("Zenira: Edge Impulse classifier ready", classifier.getProperties());
    if (this.stopped) return; // stop() was called while the classifier was still loading

    // Tap the stream's single shared AudioContext/source instead of
    // creating our own — see audioGraph.ts for why running a second,
    // independent AudioContext against the same track is unreliable.
    const { context: audioContext, source } = getSharedAudioSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (event) => this.onAudio(event, classifier, onDetected, onScores);

    // Route through a muted gain node: Safari/Firefox only fire
    // onaudioprocess once the ScriptProcessorNode reaches a destination.
    const silence = audioContext.createGain();
    silence.gain.value = 0;
    source.connect(processor);
    processor.connect(silence);
    silence.connect(audioContext.destination);

    this.source = source;
    this.processor = processor;
    this.silence = silence;
    console.info("Zenira: Edge Impulse audio graph connected, sampleRate=", audioContext.sampleRate);
  }

  private onAudio(
    event: AudioProcessingEvent,
    classifier: EdgeImpulseClassifierInstance,
    onDetected: () => void,
    onScores?: (scores: ClassScore[]) => void,
  ): void {
    const input = event.inputBuffer.getChannelData(0);
    // Edge Impulse's microphone blocks expect raw int16-range samples, not
    // the [-1, 1] floats Web Audio hands us.
    for (let i = 0; i < input.length; i++) this.buffer.push(input[i] * 32768);

    while (this.buffer.length >= HOP_SAMPLES) {
      const chunk = this.buffer.splice(0, HOP_SAMPLES);
      let result;
      try {
        result = classifier.classifyContinuous(chunk);
      } catch (err) {
        console.error("Zenira: Edge Impulse classification failed", err);
        continue;
      }

      console.debug("Zenira: wake-word scores", result.results);
      onScores?.(result.results);

      const wake = result.results.find((r) => r.label === WAKE_LABEL);
      const isWake = (wake?.value ?? 0) >= CONFIDENCE_THRESHOLD;

      // Trigger once per utterance: only fire again after the score has
      // dropped back below threshold, so holding/repeating the wake word
      // doesn't fire onDetected on every 500ms hop.
      if (isWake && !this.triggered) {
        this.triggered = true;
        onDetected();
      } else if (!isWake) {
        this.triggered = false;
      }
    }
  }

  stop(): void {
    this.stopped = true;
    // Wrapped in try/catch since the shared AudioContext may already be
    // closed by the time this runs (e.g. a fast disarm).
    try {
      if (this.source && this.processor) this.source.disconnect(this.processor);
      this.processor?.disconnect();
      this.silence?.disconnect();
    } catch {
      // already torn down
    }
    this.processor = null;
    this.source = null;
    this.silence = null;
    this.buffer = [];
    this.triggered = false;
  }
}
