import { useEffect, useState } from "react";

export interface Telemetry {
  voltage: number;
  current: number;
  temperature: number;
  distanceKm: number;
}

const INITIAL_TELEMETRY: Telemetry = { voltage: 36.1, current: 0, temperature: 28, distanceKm: 0 };
const TICK_MS = 1800;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Random-walks battery/engine telemetry within plausible bounds — cosmetic
 * only, not part of the testable boat state, but shared between the boat
 * dashboard (which displays it) and the command feedback line (which reads
 * a live value into messages like "Tensão da bateria: 35.6 V").
 */
export function useTelemetry(motorOn: boolean, speed: number): Telemetry {
  const [telemetry, setTelemetry] = useState<Telemetry>(INITIAL_TELEMETRY);

  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry((prev) => {
        const voltage = clamp(prev.voltage + (Math.random() - 0.5) * 0.15, 34.8, 37.2);

        const targetCurrent = motorOn ? (speed / 100) * 7.5 : 0;
        const current = Math.max(0, prev.current + (targetCurrent - prev.current) * 0.4 + (Math.random() - 0.5) * 0.2);

        const targetTemperature = 28 + (motorOn ? (speed / 100) * 35 : 0);
        const temperature = clamp(
          prev.temperature + (targetTemperature - prev.temperature) * 0.1 + (Math.random() - 0.5) * 0.3,
          20,
          95,
        );

        const distanceKm = prev.distanceKm + (motorOn ? (speed / 100) * 0.02 : 0);

        return { voltage, current, temperature, distanceKm };
      });
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [motorOn, speed]);

  return telemetry;
}
