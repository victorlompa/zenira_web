import { useEffect, useMemo, useRef, useState } from "react";
import { ZeniraPipeline } from "../../src/pipeline.ts";
import type { Language, PipelineState } from "../../src/types.ts";
import { createWakeWordDetector, createSpeechRecognizer, usingRealWakeWord, usingRealSpeechRecognizer } from "./engines";

export default function App() {
  const [state, setState] = useState<PipelineState>({ status: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>("pt");
  const streamRef = useRef<MediaStream | null>(null);

  // Vosk has no single bilingual model — switching language loads a
  // different model, so it can only happen while idle.
  const pipeline = useMemo(
    () => new ZeniraPipeline(createWakeWordDetector(), createSpeechRecognizer(language)),
    [language],
  );

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

      <label className="zenira__language">
        Language:{" "}
        <select
          value={language}
          disabled={state.status !== "idle"}
          onChange={(event) => setLanguage(event.target.value as Language)}
        >
          <option value="pt">Português</option>
          <option value="en">English</option>
        </select>
      </label>

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
        Wake word: {usingRealWakeWord ? "real Edge Impulse model" : "mocked (fires every few seconds)"}.
        Speech-to-text: {usingRealSpeechRecognizer ? "real Vosk model, entirely client-side" : "mocked fixed transcript"}
        {usingRealSpeechRecognizer && ` (${language === "pt" ? "Portuguese" : "English"})`}. Audio never leaves your
        device. See README.md to wire in the remaining mocked engine.
      </p>
    </main>
  );
}
