import { MockSpeechRecognizer, MockWakeWordDetector } from "../../../src/mock/mockEngines.ts";
import type { Language, SpeechRecognizer, WakeWordDetector } from "../../../src/types.ts";
import { EdgeImpulseWakeWordDetector } from "./edgeImpulseWakeWord.ts";
import { VoskSpeechRecognizer } from "./voskRecognizer.ts";

export const usingRealWakeWord = true;
export const usingRealSpeechRecognizer = true;

export function createWakeWordDetector(): WakeWordDetector {
  return usingRealWakeWord ? new EdgeImpulseWakeWordDetector() : new MockWakeWordDetector();
}

export function createSpeechRecognizer(language: Language): SpeechRecognizer {
  return usingRealSpeechRecognizer ? new VoskSpeechRecognizer(language) : new MockSpeechRecognizer();
}
