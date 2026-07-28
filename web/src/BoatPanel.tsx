import type { BoatState } from "../../src/boatState.ts";
import { InfoPopover } from "./InfoPopover.tsx";
import type { Telemetry } from "./useTelemetry.ts";

interface BoatPanelLabels {
  boatSpeedLabel: string;
  boatBoatLabel: string;
  boatMotorLabel: string;
  boatOn: string;
  boatOff: string;
  boatRudderLabel: string;
  boatLeft: string;
  boatCenter: string;
  boatRight: string;
  boatBatteryLabel: string;
  boatCurrentLabel: string;
}

interface BoatPanelProps extends BoatPanelLabels {
  className?: string;
  title: string;
  info: string;
  infoLabel: string;
  state: BoatState;
  telemetry: Telemetry;
}

// Gauge geometry: a semicircle from 180° (left, speed 0) to 0° (right, speed 100).
const GAUGE_CENTER = { x: 100, y: 100 };
const GAUGE_RADIUS = 80;

function polarPoint(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: GAUGE_CENTER.x + radius * Math.cos(rad), y: GAUGE_CENTER.y - radius * Math.sin(rad) };
}

const TRACK_START = polarPoint(180, GAUGE_RADIUS);
const TRACK_END = polarPoint(0, GAUGE_RADIUS);
const TRACK_PATH = `M ${TRACK_START.x} ${TRACK_START.y} A ${GAUGE_RADIUS} ${GAUGE_RADIUS} 0 0 1 ${TRACK_END.x} ${TRACK_END.y}`;

export function BoatPanel({
  className,
  title,
  state,
  telemetry,
  boatSpeedLabel,
  boatBoatLabel,
  boatMotorLabel,
  boatOn,
  boatOff,
  boatRudderLabel,
  boatLeft,
  boatCenter,
  boatRight,
  boatBatteryLabel,
  boatCurrentLabel,
}: BoatPanelProps) {
  const { voltage, current } = telemetry;

  const needleRotation = (state.speed - 50) * 1.8; // -90deg (left) .. +90deg (right), 0 at speed 50
  const rudderPercent = 50 + (state.rudder / 45) * 50;
  const rudderLabel = state.rudder < -5 ? boatLeft : state.rudder > 5 ? boatRight : boatCenter;

  return (
    <div className={`panel ${className ?? ""}`}>
      <h2 className="panel__title">{title}</h2>

      <div className="boat-status-row">
        <span className={`status-pill ${state.powered ? "status-pill--on" : ""}`}>
          {boatBoatLabel}: {state.powered ? boatOn : boatOff}
        </span>
        <span className={`status-pill ${state.motorOn ? "status-pill--on" : ""}`}>
          {boatMotorLabel}: {state.motorOn ? boatOn : boatOff}
        </span>
      </div>

      <div className="gauge">
        <p className="card__label">{boatSpeedLabel}</p>
        <svg viewBox="0 0 200 112" className="gauge__svg" aria-hidden="true">
          <path d={TRACK_PATH} className="gauge__track" fill="none" strokeWidth="10" strokeLinecap="round" />
          <g
            className="gauge__needle"
            style={{ transform: `rotate(${needleRotation}deg)`, transformOrigin: `${GAUGE_CENTER.x}px ${GAUGE_CENTER.y}px` }}
          >
            <line x1={GAUGE_CENTER.x} y1={GAUGE_CENTER.y} x2={GAUGE_CENTER.x} y2={GAUGE_CENTER.y - 65} strokeWidth="4" strokeLinecap="round" />
          </g>
          <circle cx={GAUGE_CENTER.x} cy={GAUGE_CENTER.y} r="6" className="gauge__hub" />
        </svg>
        <p className="gauge__value">{Math.round(state.speed)}</p>
      </div>

      <div className="rudder">
        <div className="rudder__row">
          <p className="card__label">{boatRudderLabel}</p>
          <span className="rudder__value">{rudderLabel}</span>
        </div>
        <div className="rudder__track">
          <div className="rudder__center-mark" />
          <div className="rudder__marker" style={{ left: `${rudderPercent}%` }} />
        </div>
      </div>

      <div className="telemetry">
        <div className="telemetry__row">
          <span>{boatBatteryLabel}</span>
          <span>{voltage.toFixed(1)} V</span>
        </div>
        <div className="telemetry__row">
          <span>{boatCurrentLabel}</span>
          <span>{current.toFixed(1)} A</span>
        </div>
      </div>
    </div>
  );
}
