import { useEffect, useRef, useState } from "react";
import { getSharedAudioSource } from "./audioGraph.ts";

/**
 * Draws a live waveform from the raw microphone stream — independent of
 * the wake-word/STT engines — so it's obvious from the demo page alone
 * whether the browser is actually capturing audio.
 */
interface AudioLevelMeterProps {
  stream: MediaStream | null;
  label: string;
  noTrackWarning: string;
}

export function AudioLevelMeter({ stream, label, noTrackWarning }: AudioLevelMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    setWarning(null);
    if (!stream) return;

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      setWarning(noTrackWarning);
      return;
    }
    console.info("Zenira: microphone track settings", audioTracks[0].getSettings());

    // Tap the stream's single shared AudioContext/source instead of
    // creating our own — see audioGraph.ts for why running a second,
    // independent AudioContext against the same track is unreliable.
    const { context: audioContext, source } = getSharedAudioSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);

    const data = new Uint8Array(analyser.fftSize);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    let frame = 0;

    function draw() {
      frame = requestAnimationFrame(draw);
      if (!canvas || !ctx) return;
      analyser.getByteTimeDomainData(data);

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth * dpr;
      const height = canvas.clientHeight * dpr;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const styles = getComputedStyle(canvas);
      const accentStart = styles.getPropertyValue("--accent-start").trim() || "#4d6ef5";
      const accentEnd = styles.getPropertyValue("--accent-end").trim() || "#2438c9";

      ctx.clearRect(0, 0, width, height);

      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, accentStart);
      gradient.addColorStop(1, accentEnd);
      ctx.lineWidth = 2 * dpr;
      ctx.strokeStyle = gradient;
      ctx.lineJoin = "round";
      ctx.beginPath();

      const sliceWidth = width / data.length;
      let x = 0;
      for (let i = 0; i < data.length; i++) {
        const v = data[i] / 128 - 1;
        const y = height / 2 + v * (height / 2 - 2 * dpr);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.stroke();
    }

    draw();

    return () => {
      cancelAnimationFrame(frame);
      // The shared AudioContext may already be closed by the time this
      // runs (e.g. a fast disarm) — disconnecting nodes on a closed
      // context throws in some browsers, which would otherwise crash the
      // whole render tree since nothing here catches it.
      try {
        source.disconnect(analyser);
        analyser.disconnect();
      } catch {
        // already torn down
      }
    };
  }, [stream, noTrackWarning]);

  return (
    <div className="card meter">
      <p className="card__label">{label}</p>
      <canvas ref={canvasRef} className="meter__canvas" />
      {warning && (
        <p className="alert" role="alert">
          {warning}
        </p>
      )}
    </div>
  );
}
