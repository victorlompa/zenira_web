import { describe, expect, it, vi } from "vitest";
import { ZeniraPipeline } from "../src/pipeline.js";
import type { ClassScore, SpeechRecognizer, WakeWordDetector } from "../src/types.js";

function fakeStream(): MediaStream {
  return {} as MediaStream;
}

class FakeWakeWord implements WakeWordDetector {
  stopped = false;
  onDetected: (() => void) | null = null;
  onScores: ((scores: ClassScore[]) => void) | null = null;

  start(_stream: MediaStream, onDetected: () => void, onScores?: (scores: ClassScore[]) => void): void {
    this.onDetected = onDetected;
    this.onScores = onScores ?? null;
  }

  stop(): void {
    this.stopped = true;
  }

  detect(): void {
    this.onDetected?.();
  }

  reportScores(scores: ClassScore[]): void {
    this.onScores?.(scores);
  }
}

class FakeRecognizer implements SpeechRecognizer {
  onFinal: ((text: string) => void) | null = null;

  start(_stream: MediaStream, _onPartial: (text: string) => void, onFinal: (text: string) => void): void {
    this.onFinal = onFinal;
  }

  stop(): void {}

  finish(text: string): void {
    this.onFinal?.(text);
  }
}

describe("ZeniraPipeline", () => {
  it("goes idle -> armed -> listening, matching intent from each final result", () => {
    const wakeWord = new FakeWakeWord();
    const recognizer = new FakeRecognizer();
    const pipeline = new ZeniraPipeline(wakeWord, recognizer);
    const states = vi.fn();
    pipeline.onStateChange(states);

    expect(pipeline.getState().status).toBe("idle");

    pipeline.arm(fakeStream());
    expect(pipeline.getState().status).toBe("armed");

    pipeline.triggerWakeWord();
    expect(pipeline.getState().status).toBe("listening");

    recognizer.finish("qual a bateria");
    const afterFirst = pipeline.getState();
    expect(afterFirst.status).toBe("listening");
    if (afterFirst.status === "listening") {
      expect(afterFirst.lastResult?.intent.name).toBe("status.battery");
    }
  });

  it("keeps transcribing continuously — a second final result updates the last result without leaving listening", () => {
    const wakeWord = new FakeWakeWord();
    const recognizer = new FakeRecognizer();
    const pipeline = new ZeniraPipeline(wakeWord, recognizer);

    pipeline.arm(fakeStream());
    pipeline.triggerWakeWord();
    recognizer.finish("qual a bateria");
    recognizer.finish("qual a velocidade");

    const state = pipeline.getState();
    expect(state.status).toBe("listening");
    if (state.status === "listening") {
      expect(state.lastResult?.intent.name).toBe("status.speed");
    }
  });

  it("stops the wake-word detector once listening starts", () => {
    const wakeWord = new FakeWakeWord();
    const recognizer = new FakeRecognizer();
    const pipeline = new ZeniraPipeline(wakeWord, recognizer);

    pipeline.arm(fakeStream());
    pipeline.triggerWakeWord();

    expect(wakeWord.stopped).toBe(true);
  });

  it("triggerWakeWord starts listening manually while armed, but not otherwise", () => {
    const wakeWord = new FakeWakeWord();
    const recognizer = new FakeRecognizer();
    const pipeline = new ZeniraPipeline(wakeWord, recognizer);

    pipeline.triggerWakeWord();
    expect(pipeline.getState().status).toBe("idle");

    pipeline.arm(fakeStream());
    pipeline.triggerWakeWord();
    expect(pipeline.getState().status).toBe("listening");
  });

  it("starts the wake-word detector on arm, and its own detection starts listening too", () => {
    const wakeWord = new FakeWakeWord();
    const recognizer = new FakeRecognizer();
    const pipeline = new ZeniraPipeline(wakeWord, recognizer);

    pipeline.arm(fakeStream());
    wakeWord.detect();

    expect(pipeline.getState().status).toBe("listening");
  });

  it("surfaces live wake-word scores while armed", () => {
    const wakeWord = new FakeWakeWord();
    const recognizer = new FakeRecognizer();
    const pipeline = new ZeniraPipeline(wakeWord, recognizer);

    pipeline.arm(fakeStream());
    wakeWord.reportScores([
      { label: "Zenira", value: 0.12 },
      { label: "noise", value: 0.3 },
      { label: "unknown", value: 0.58 },
    ]);

    const state = pipeline.getState();
    expect(state.status).toBe("armed");
    if (state.status === "armed") {
      expect(state.wakeWordScores?.find((s) => s.label === "Zenira")?.value).toBe(0.12);
    }
  });

  it("stops both engines on disarm", () => {
    const wakeWord = new FakeWakeWord();
    const recognizer = new FakeRecognizer();
    const pipeline = new ZeniraPipeline(wakeWord, recognizer);

    pipeline.arm(fakeStream());
    pipeline.disarm();

    expect(wakeWord.stopped).toBe(true);
    expect(pipeline.getState().status).toBe("idle");
  });
});
