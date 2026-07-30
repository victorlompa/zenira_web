export interface ClassScore {
  label: string;
  value: number;
}

export interface WakeWordDetector {
  start(
    stream: MediaStream,
    onDetected: () => void,
    onScores?: (scores: ClassScore[]) => void,
    onError?: (error: unknown) => void,
  ): void;
  stop(): void;
}

export interface SpeechRecognizer {
  start(
    stream: MediaStream,
    onPartial: (text: string) => void,
    onFinal: (text: string) => void,
    onError?: (error: unknown) => void,
  ): void;
  stop(): void;
}

export type Language = "pt" | "en";

export type PipelineState =
  | { status: "idle" }
  | { status: "armed"; wakeWordScores?: ClassScore[]; lastResult?: { transcript: string; intent: Intent } }
  | { status: "listening"; partialTranscript: string; lastResult?: { transcript: string; intent: Intent } };

export interface Intent {
  name: string;
  confidence: number;
}
