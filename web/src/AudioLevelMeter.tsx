import { useEffect, useRef, useState } from "react";
import { getSharedAudioSource } from "./audioGraph.ts";
import { InfoPopover } from "./InfoPopover.tsx";

interface AudioLevelMeterProps {
  stream: MediaStream | null;
  label: string;
  noTrackWarning: string;
  infoText: string;
  infoLabel: string;
}

export function AudioLevelMeter({ stream, label, noTrackWarning, infoText, infoLabel }: AudioLevelMeterProps) {
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
      try {
        source.disconnect(analyser);
        analyser.disconnect();
      } catch {}
    };
  }, [stream, noTrackWarning]);

  return (
    <div className="card meter">
      <div className="card__header">
        <p className="card__label">{label}</p>
        <InfoPopover text={infoText} label={infoLabel} />
      </div>
      <canvas ref={canvasRef} className="meter__canvas" />
      {warning && (
        <p className="alert" role="alert">
          {warning}
        </p>
      )}
    </div>
  );
}
