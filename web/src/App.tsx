import { useEffect, useMemo, useRef, useState } from "react";
import { ZeniraPipeline } from "../../src/pipeline.ts";
import type { PipelineState } from "../../src/types.ts";
import { createWakeWordDetector, createSpeechRecognizer, usingRealEngines } from "./engines";

export default function App() {
  const [state, setState] = useState<PipelineState>({ status: "idle" });
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const pipeline = useMemo(() => new ZeniraPipeline(createWakeWordDetector(), createSpeechRecognizer()), []);

  useEffect(() => pipeline.onStateChange(setState), [pipeline]);
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  async function handleArm() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      pipeline.arm(stream);
    } catch {
      setError("Microphone access denied — Zenira needs it to detect the wake word.");
    }
  }

  function handleDisarm() {
    pipeline.disarm();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  return (
    <main className="zenira">
      <h1>Zenira</h1>
      <p className="zenira__status">status: {state.status}</p>

      <p className="zenira__transcript">
        {state.status === "listening" && state.partialTranscript}
        {state.status === "command" && `"${state.transcript}" → ${state.intent.name}`}
      </p>

      {state.status === "idle" ? (
        <button onClick={handleArm}>Start listening</button>
      ) : (
        <button onClick={handleDisarm}>Stop</button>
      )}

      {error && <p role="alert">{error}</p>}

      <p className="zenira__note">
        {usingRealEngines
          ? "Running the real Edge Impulse (wake word) + Vosk (speech-to-text) pipeline, entirely client-side — audio never leaves your device."
          : "Demo mode: using mocked wake-word and speech-to-text engines. See README.md to wire in the real Edge Impulse / Vosk WASM builds from the MCV25 project."}
      </p>
    </main>
  );
}
