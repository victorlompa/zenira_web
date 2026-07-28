import { describe, expect, it, vi } from "vitest";
import { ZeniraPipeline } from "../src/pipeline.js";
import type { SpeechRecognizer, WakeWordDetector } from "../src/types.js";

function fakeStream(): MediaStream {
  return {} as MediaStream;
}

class FakeWakeWord implements WakeWordDetector {
  onDetected: (() => void) | null = null;
  stopped = false;

  start(_stream: MediaStream, onDetected: () => void): void {
    this.onDetected = onDetected;
  }

  stop(): void {
    this.stopped = true;
  }

  trigger(): void {
    this.onDetected?.();
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
  it("goes idle -> armed -> listening -> command -> armed", () => {
    const wakeWord = new FakeWakeWord();
    const recognizer = new FakeRecognizer();
    const pipeline = new ZeniraPipeline(wakeWord, recognizer);
    const states = vi.fn();
    pipeline.onStateChange(states);

    expect(pipeline.getState().status).toBe("idle");

    pipeline.arm(fakeStream());
    expect(pipeline.getState().status).toBe("armed");

    wakeWord.trigger();
    expect(pipeline.getState().status).toBe("listening");

    recognizer.finish("qual a bateria");
    const finalState = pipeline.getState();
    expect(finalState.status).toBe("command");
    if (finalState.status === "command") {
      expect(finalState.intent.name).toBe("status.battery");
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
