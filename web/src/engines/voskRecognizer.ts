import { createModel, type KaldiRecognizer, type Model } from "vosk-browser";
import { buildVoskVocabulary } from "../../../src/commands.ts";
import type { Language, SpeechRecognizer } from "../../../src/types.ts";
import { getSharedAudioSource } from "../audioGraph.ts";
import { MODELS_BASE_URL } from "../modelsBaseUrl.ts";

const MODEL_URLS: Record<Language, string> = {
  pt: `${MODELS_BASE_URL}/vosk-model-small-pt-0.3.tar.gz`,
  en: `${MODELS_BASE_URL}/vosk-model-small-en-us-0.15.tar.gz`,
};

const modelCache = new Map<Language, Promise<Model>>();

function loadModel(language: Language): Promise<Model> {
  let model = modelCache.get(language);
  if (!model) {
    model = createModel(MODEL_URLS[language]);
    model.catch(() => modelCache.delete(language));
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

  start(
    stream: MediaStream,
    onPartial: (text: string) => void,
    onFinal: (text: string) => void,
    onError?: (error: unknown) => void,
  ): void {
    this.startAsync(stream, onPartial, onFinal).catch((error: unknown) => {
      console.error("Zenira: Vosk failed to start", error);
      onError?.(error);
    });
  }

  private async startAsync(
    stream: MediaStream,
    onPartial: (text: string) => void,
    onFinal: (text: string) => void,
  ): Promise<void> {
    const model = await loadModel(this.language);

    const { context: audioContext, source } = getSharedAudioSource(stream);
    const grammar = JSON.stringify(buildVoskVocabulary(this.language));
    const recognizer = new model.KaldiRecognizer(audioContext.sampleRate, grammar);
    recognizer.setWords(true);
    recognizer.on("partialresult", (message) => {
      if (message.event === "partialresult") onPartial(message.result.partial);
    });
    recognizer.on("result", (message) => {
      if (message.event === "result") onFinal(message.result.text);
    });

    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (event) => recognizer.acceptWaveform(event.inputBuffer);

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
    try {
      if (this.source && this.processor) this.source.disconnect(this.processor);
      this.processor?.disconnect();
      this.silence?.disconnect();
    } catch {}
    this.recognizer?.remove();
    this.processor = null;
    this.source = null;
    this.silence = null;
    this.recognizer = null;
  }
}
