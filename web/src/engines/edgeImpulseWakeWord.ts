import type { ClassScore, WakeWordDetector } from "../../../src/types.ts";
import { getSharedAudioSource } from "../audioGraph.ts";
import { createEdgeImpulseClassifier, type EdgeImpulseClassifierInstance } from "./edgeImpulseClassifier.ts";

const HOP_SAMPLES = 8000;
const WAKE_LABEL = "Zenira";
const CONFIDENCE_THRESHOLD = 0.5;

export class EdgeImpulseWakeWordDetector implements WakeWordDetector {
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private silence: GainNode | null = null;
  private buffer: number[] = [];
  private triggered = false;
  private stopped = false;

  start(
    stream: MediaStream,
    onDetected: () => void,
    onScores?: (scores: ClassScore[]) => void,
    onError?: (error: unknown) => void,
  ): void {
    this.stopped = false;
    this.startAsync(stream, onDetected, onScores).catch((error: unknown) => {
      console.error("Zenira: Edge Impulse wake word failed to start", error);
      onError?.(error);
    });
  }

  private async startAsync(
    stream: MediaStream,
    onDetected: () => void,
    onScores?: (scores: ClassScore[]) => void,
  ): Promise<void> {
    console.info("Zenira: loading Edge Impulse classifier…");
    const classifier = await createEdgeImpulseClassifier();
    console.info("Zenira: Edge Impulse classifier ready", classifier.getProperties());
    if (this.stopped) return;

    const { context: audioContext, source } = getSharedAudioSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (event) => this.onAudio(event, classifier, onDetected, onScores);

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
    try {
      if (this.source && this.processor) this.source.disconnect(this.processor);
      this.processor?.disconnect();
      this.silence?.disconnect();
    } catch {}
    this.processor = null;
    this.source = null;
    this.silence = null;
    this.buffer = [];
    this.triggered = false;
  }
}
