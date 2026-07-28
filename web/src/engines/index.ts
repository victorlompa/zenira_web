import { MockSpeechRecognizer, MockWakeWordDetector } from "../../../src/mock/mockEngines.ts";
import type { SpeechRecognizer, WakeWordDetector } from "../../../src/types.ts";
import { EdgeImpulseWakeWordDetector } from "./edgeImpulseWakeWord.ts";
import { VoskSpeechRecognizer } from "./voskRecognizer.ts";

/**
 * Flip this once both real engines are wired in (see the two files in this
 * folder for exactly what to drop in and where).
 */
export const usingRealEngines = false;

export function createWakeWordDetector(): WakeWordDetector {
  return usingRealEngines ? new EdgeImpulseWakeWordDetector() : new MockWakeWordDetector();
}

export function createSpeechRecognizer(): SpeechRecognizer {
  return usingRealEngines ? new VoskSpeechRecognizer() : new MockSpeechRecognizer();
}
