import type { CommandFeedback } from "../../src/boatState.ts";
import type { Strings } from "./i18n.ts";
import type { Telemetry } from "./useTelemetry.ts";

export function describeFeedback(feedback: CommandFeedback, telemetry: Telemetry, t: Strings): string {
  switch (feedback.kind) {
    case "powerOn":
      return t.fbPowerOn;
    case "powerOff":
      return t.fbPowerOff;
    case "motorOn":
      return t.fbMotorOn;
    case "motorOnRejected":
      return t.fbMotorOnRejected;
    case "motorOff":
      return t.fbMotorOff;
    case "speedChanged":
      return t.fbSpeedChanged(feedback.speed);
    case "speedRejectedNoPower":
      return t.fbSpeedRejectedNoPower;
    case "speedRejectedNoMotor":
      return t.fbSpeedRejectedNoMotor;
    case "directionChanged": {
      const label = feedback.rudder < -5 ? t.boatLeft : feedback.rudder > 5 ? t.boatRight : t.boatCenter;
      return t.fbDirectionChanged(label);
    }
    case "directionRejected":
      return t.fbDirectionRejected;
    case "muted":
      return t.fbMuted;
    case "queryBattery":
      return t.fbQueryBattery(telemetry.voltage);
    case "querySpeed":
      return t.fbQuerySpeed(feedback.speed);
    case "queryTemperature":
      return t.fbQueryTemperature(telemetry.temperature);
    case "queryDistance":
      return t.fbQueryDistance(telemetry.distanceKm);
    case "unknown":
      return t.fbUnknown;
  }
}
