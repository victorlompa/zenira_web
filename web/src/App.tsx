import { useEffect, useMemo, useRef, useState } from "react";
import { applyCommand, INITIAL_BOAT_STATE, type BoatState } from "../../src/boatState.ts";
import { ZeniraPipeline } from "../../src/pipeline.ts";
import type { Intent, Language, PipelineState } from "../../src/types.ts";
import { AudioLevelMeter } from "./AudioLevelMeter.tsx";
import { releaseSharedAudioSource } from "./audioGraph.ts";
import { BoatPanel } from "./BoatPanel.tsx";
import { CommandHistory, type HistoryEntry } from "./CommandHistory.tsx";
import { CommandLibrary } from "./CommandLibrary.tsx";
import { createWakeWordDetector, createSpeechRecognizer, usingRealWakeWord, usingRealSpeechRecognizer } from "./engines";
import { describeFeedback } from "./feedback.ts";
import { STRINGS } from "./i18n.ts";
import { InfoPopover } from "./InfoPopover.tsx";
import { useTelemetry } from "./useTelemetry.ts";

type Tab = "library" | "zenira" | "history";

const MAX_HISTORY_ENTRIES = 25;

// vosk-browser's own recommended constraints: mono, 16kHz (its models are
// trained at that rate — capturing at it avoids relying on the browser's
// default device rate/channel count, which is what most often looks like
// "the mic isn't being captured" when it's really just a mismatch upstream.
// deviceId is added on top of this when the user picks a specific mic —
// without it, the browser's own idea of the "default" input device can
// differ from whichever one was actually granted permission (e.g. it picks
// a disconnected/broken virtual "wireless microphone" over a real headset).
function micConstraints(deviceId: string): MediaStreamConstraints {
  return {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      channelCount: 1,
      sampleRate: 16000,
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
    },
  };
}

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  const stored = localStorage.getItem("zenira-theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function App() {
  const [state, setState] = useState<PipelineState>({ status: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>("pt");
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [micDeviceId, setMicDeviceId] = useState(() => localStorage.getItem("zenira-mic-device") ?? "");
  const [tab, setTab] = useState<Tab>("zenira");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [boat, setBoat] = useState<BoatState>(INITIAL_BOAT_STATE);
  const [feedback, setFeedback] = useState<string | null>(null);
  const lastLoggedResult = useRef<{ transcript: string; intent: Intent } | undefined>(undefined);
  const t = STRINGS[language];
  const telemetry = useTelemetry(boat.motorOn, boat.speed);
  // Read inside the intent-processing effect without making it re-run on
  // every telemetry tick (it only cares about `state`, not the ambient
  // battery/temperature random walk).
  const telemetryRef = useRef(telemetry);
  useEffect(() => {
    telemetryRef.current = telemetry;
  }, [telemetry]);
  const boatRef = useRef(boat);
  useEffect(() => {
    boatRef.current = boat;
  }, [boat]);

  async function refreshMicDevices() {
    const all = await navigator.mediaDevices.enumerateDevices();
    setMicDevices(all.filter((d) => d.kind === "audioinput"));
  }

  useEffect(() => {
    void refreshMicDevices();
    navigator.mediaDevices.addEventListener("devicechange", refreshMicDevices);
    return () => navigator.mediaDevices.removeEventListener("devicechange", refreshMicDevices);
  }, []);

  useEffect(() => {
    localStorage.setItem("zenira-mic-device", micDeviceId);
  }, [micDeviceId]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("zenira-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language === "pt" ? "pt-BR" : "en";
  }, [language]);

  // Vosk has no single bilingual model — switching language loads a
  // different model, so it can only happen while idle. The same picker
  // also drives the UI's own language, not just which model gets loaded.
  const pipeline = useMemo(
    () => new ZeniraPipeline(createWakeWordDetector(), createSpeechRecognizer(language), language),
    [language],
  );

  useEffect(() => pipeline.onStateChange(setState), [pipeline]);
  useEffect(() => {
    if (state.status !== "listening" || !state.lastResult) return;
    if (state.lastResult === lastLoggedResult.current) return;
    lastLoggedResult.current = state.lastResult;
    const { transcript, intent } = state.lastResult;
    // Computed once, outside of any state-updater callback: React (in
    // StrictMode especially) may invoke an updater function more than
    // once, so calling setFeedback from inside setBoat's updater was
    // unreliable — sometimes leaving Output showing a stale message
    // instead of "Comando não reconhecido" for a genuinely new, invalid
    // command.
    const result = applyCommand(boatRef.current, intent.name, transcript, language);
    setBoat(result.state);
    setFeedback(describeFeedback(result.feedback, telemetryRef.current, t));
    setHistory((prev) =>
      [
        { id: `${Date.now()}-${prev.length}`, time: new Date().toLocaleTimeString(), transcript, intentName: intent.name },
        ...prev,
      ].slice(0, MAX_HISTORY_ENTRIES),
    );
  }, [state, t, language]);
  useEffect(
    () => () => {
      if (!micStream) return;
      micStream.getTracks().forEach((track) => track.stop());
      releaseSharedAudioSource(micStream);
    },
    [micStream],
  );

  async function handleArm() {
    setError(null);
    setFeedback(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia(micConstraints(micDeviceId));
      setMicStream(stream);
      pipeline.arm(stream);
      void refreshMicDevices(); // device labels only populate once permission is granted
    } catch {
      setError(t.micDenied);
    }
  }

  function handleDisarm() {
    pipeline.disarm();
    setFeedback(null);
    // Only stop the tracks here; releasing the shared AudioContext is left
    // to the [micStream] effect's cleanup below. That cleanup runs after
    // AudioLevelMeter has unmounted (React tears down child effects before
    // parent ones in the same commit) — closing the context here instead
    // would race ahead of that and leave the meter disconnecting a node
    // from an already-closed context, which throws and blanks the page.
    micStream?.getTracks().forEach((track) => track.stop());
    setMicStream(null);
  }

  function handleTriggerWakeWord() {
    pipeline.triggerWakeWord();
  }

  return (
    <div className="layout" data-active={tab}>
      <CommandLibrary
        className="panel--library"
        title={t.libraryTitle}
        hint={t.infoLibrary}
        infoLabel={t.infoLabel}
        categoryLabel={t.categoryLabel}
        language={language}
      />

      <main className="page">
      <div className="shell">
        <header className="shell__header">
          <span className="shell__logo">Zenira</span>
          <button
            type="button"
            className={`switch ${theme === "dark" ? "switch--on" : ""}`}
            role="switch"
            aria-checked={theme === "dark"}
            aria-label={t.toggleDarkMode}
            title={t.toggleDarkMode}
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
          >
            <span className="switch__thumb">
              {theme === "dark" ? (
                <svg className="switch__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" fill="currentColor" />
                </svg>
              ) : (
                <svg className="switch__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="4.5" fill="currentColor" />
                  <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8L6 18M18 6l1.8-1.8" />
                  </g>
                </svg>
              )}
            </span>
          </button>
        </header>

        <p className="shell__status-row">
          <span className={`status-pill status-pill--${state.status}`}>{t.status[state.status]}</span>
        </p>

        {micStream && (
          <AudioLevelMeter
            stream={micStream}
            label={t.micLabel}
            noTrackWarning={t.micNoTrack}
            infoText={t.infoMic}
            infoLabel={t.infoLabel}
          />
        )}

        {state.status === "armed" && state.wakeWordScores && (
          <div className="card">
            <div className="card__header">
              <p className="card__label">{t.wakeWordScoresLabel}</p>
              <InfoPopover text={t.infoWakeWordScores} label={t.infoLabel} />
            </div>
            {state.wakeWordScores.map((score) => (
              <div className="scorebar" key={score.label}>
                <div className="scorebar__row">
                  <span>{score.label}</span>
                  <span>{Math.round(score.value * 100)}%</span>
                </div>
                <div className="scorebar__track">
                  <div className="scorebar__fill" style={{ width: `${Math.round(score.value * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {state.status === "idle" && (
          <>
            <div className="segmented" role="group" aria-label="Language">
              <button
                type="button"
                className={`segmented__option ${language === "pt" ? "segmented__option--active" : ""}`}
                onClick={() => setLanguage("pt")}
              >
                Português
              </button>
              <button
                type="button"
                className={`segmented__option ${language === "en" ? "segmented__option--active" : ""}`}
                onClick={() => setLanguage("en")}
              >
                English
              </button>
            </div>

            <label className="field">
              <span className="field__label">{t.micDeviceLabel}</span>
              <select
                className="field__select"
                value={micDeviceId}
                onChange={(event) => setMicDeviceId(event.target.value)}
              >
                <option value="">{t.micDeviceDefault}</option>
                {micDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || device.deviceId}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {state.status !== "armed" && (
          <div className="card">
            <div className="card__header">
              <p className="card__label">{t.transcriptLabel}</p>
              <InfoPopover text={t.infoTranscript} label={t.infoLabel} />
            </div>
            <p className="card__body">
              {state.status === "listening" ? (
                state.partialTranscript || "…"
              ) : (
                <span className="card__placeholder">{t.idlePlaceholder}</span>
              )}
            </p>
            {state.status === "listening" && state.lastResult && (
              <p className="card__result">
                "{state.lastResult.transcript}" → <strong>{state.lastResult.intent.name}</strong>
              </p>
            )}
          </div>
        )}

        <div className="card">
          <div className="card__header">
            <p className="card__label">{t.outputLabel}</p>
            <InfoPopover text={t.infoOutput} label={t.infoLabel} />
          </div>
          <p className="card__body">{feedback ?? <span className="card__placeholder">{t.outputPlaceholder}</span>}</p>
        </div>

        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}

        {state.status === "armed" && (
          <button type="button" className="btn-secondary" onClick={handleTriggerWakeWord}>
            {t.triggerWakeWord}
          </button>
        )}

        <button className="btn-primary" onClick={state.status === "idle" ? handleArm : handleDisarm}>
          {state.status === "idle" ? t.start : t.stop}
        </button>

        <p className="note">
          {state.status === "idle" ? t.idleNote : t.note(usingRealWakeWord, usingRealSpeechRecognizer, language)}
        </p>
      </div>
      </main>

      <div className="side-column">
        <BoatPanel
          className="panel--boat"
          title={t.boatTitle}
          state={boat}
          telemetry={telemetry}
          boatSpeedLabel={t.boatSpeedLabel}
          boatBoatLabel={t.boatBoatLabel}
          boatMotorLabel={t.boatMotorLabel}
          boatOn={t.boatOn}
          boatOff={t.boatOff}
          boatRudderLabel={t.boatRudderLabel}
          boatLeft={t.boatLeft}
          boatCenter={t.boatCenter}
          boatRight={t.boatRight}
          boatBatteryLabel={t.boatBatteryLabel}
          boatCurrentLabel={t.boatCurrentLabel}
        />

        <CommandHistory
          className="panel--history"
          title={t.historyTitle}
          emptyLabel={t.historyEmpty}
          unknownLabel={t.historyUnknown}
          entries={history}
        />
      </div>

      <nav className="tabbar">
        <button
          type="button"
          className={`tabbar__btn ${tab === "library" ? "tabbar__btn--active" : ""}`}
          onClick={() => setTab("library")}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 10 20H5.5A1.5 1.5 0 0 1 4 18.5v-13ZM12.5 5.5A1.5 1.5 0 0 1 14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14a1.5 1.5 0 0 1-1.5-1.5v-13Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
          {t.tabLibrary}
        </button>
        <button
          type="button"
          className={`tabbar__btn ${tab === "zenira" ? "tabbar__btn--active" : ""}`}
          onClick={() => setTab("zenira")}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21m-3 0h6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          {t.tabZenira}
        </button>
        <button
          type="button"
          className={`tabbar__btn ${tab === "history" ? "tabbar__btn--active" : ""}`}
          onClick={() => setTab("history")}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t.tabHistory}
        </button>
      </nav>
    </div>
  );
}
