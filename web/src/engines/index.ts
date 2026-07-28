import { MockSpeechRecognizer, MockWakeWordDetector } from "../../../src/mock/mockEngines.ts";
import type { Language, SpeechRecognizer, WakeWordDetector } from "../../../src/types.ts";
import { EdgeImpulseWakeWordDetector } from "./edgeImpulseWakeWord.ts";
import { VoskSpeechRecognizer } from "./voskRecognizer.ts";

/**
 * Each engine is wired in independently — flip its flag once its real
 * implementation is ready (see the two files in this folder for exactly
 * what to drop in and where).
 */
export const usingRealWakeWord = true;
export const usingRealSpeechRecognizer = true;
export const usingRealEngines = usingRealWakeWord && usingRealSpeechRecognizer;

export function createWakeWordDetector(): WakeWordDetector {
  return usingRealWakeWord ? new EdgeImpulseWakeWordDetector() : new MockWakeWordDetector();
}

export function createSpeechRecognizer(language: Language): SpeechRecognizer {
  return usingRealSpeechRecognizer ? new VoskSpeechRecognizer(language) : new MockSpeechRecognizer();
}
