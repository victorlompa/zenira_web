import { createModel, type KaldiRecognizer, type Model } from "vosk-browser";
import type { Language, SpeechRecognizer } from "../../../src/types.ts";
import { getSharedAudioSource } from "../audioGraph.ts";

/**
 * Real speech-to-text engine, backed by Vosk running in the browser via
 * vosk-browser (Apache-2.0, WASM build of Vosk). Models are loaded from
 * `web/public/models/<name>.tar.gz` — see README.md for how to build those
 * from the small Vosk models published at https://alphacephei.com/vosk/models.
 *
 * Only the "small" models are practical to ship to a browser (tens of MB);
 * the large/full models (~1.8GB) would have to run server-side instead.
 */
const MODEL_URLS: Record<Language, string> = {
  pt: "/models/vosk-model-small-pt-0.3.tar.gz",
  en: "/models/vosk-model-small-en-us-0.15.tar.gz",
};

// Loading a model spins up a Web Worker and can take a few seconds; cache by
// language so switching back to a previously used language is instant and
// arming/disarming repeatedly doesn't reload it each time.
const modelCache = new Map<Language, Promise<Model>>();

function loadModel(language: Language): Promise<Model> {
  let model = modelCache.get(language);
  if (!model) {
    model = createModel(MODEL_URLS[language]);
    modelCache.set(language, model);
  }
  return model;
}

export class VoskSpeechRecognizer implements SpeechRecognizer {
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private silence: GainNode | null = null;
  private recognizer: KaldiRecognizer | null = null;

  constructor(private readonly language: Language) {}

  start(stream: MediaStream, onPartial: (text: string) => void, onFinal: (text: string) => void): void {
    void this.startAsync(stream, onPartial, onFinal);
  }

  private async startAsync(
    stream: MediaStream,
    onPartial: (text: string) => void,
    onFinal: (text: string) => void,
  ): Promise<void> {
    const model = await loadModel(this.language);

    // Tap the stream's single shared AudioContext/source instead of
    // creating our own — see audioGraph.ts for why running a second,
    // independent AudioContext against the same track is unreliable.
    const { context: audioContext, source } = getSharedAudioSource(stream);
    const recognizer = new model.KaldiRecognizer(audioContext.sampleRate);
    recognizer.setWords(true);
    recognizer.on("partialresult", (message) => {
      if (message.event === "partialresult") onPartial(message.result.partial);
    });
    recognizer.on("result", (message) => {
      if (message.event === "result") onFinal(message.result.text);
    });

    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (event) => recognizer.acceptWaveform(event.inputBuffer);

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
    this.recognizer = recognizer;
  }

  stop(): void {
    // Disconnect only this instance's edge from the shared source node —
    // never a bare disconnect(), which would also sever other consumers
    // (the level meter) tapping the same stream. Wrapped in try/catch since
    // the shared AudioContext may already be closed by the time this runs.
    try {
      if (this.source && this.processor) this.source.disconnect(this.processor);
      this.processor?.disconnect();
      this.silence?.disconnect();
    } catch {
      // already torn down
    }
    this.recognizer?.remove();
    this.processor = null;
    this.source = null;
    this.silence = null;
    this.recognizer = null;
  }
}
