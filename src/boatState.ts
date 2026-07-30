import { parseNumber } from "./numbers.js";
import type { Language } from "./types.js";

export interface BoatState {
  powered: boolean;
  motorOn: boolean;
  speed: number;
  rudder: number;
}

export const INITIAL_BOAT_STATE: BoatState = { powered: false, motorOn: false, speed: 0, rudder: 0 };

const SPEED_DEFAULT_STEP = 10;
const SPEED_MAX = 100;
const RUDDER_DEFAULT_STEP = 10;
export const RUDDER_MAX = 90;
const ROUND_TO = 5;

function roundTo5(value: number): number {
  return Math.round(value / ROUND_TO) * ROUND_TO;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export type CommandFeedback =
  | { kind: "powerOn" }
  | { kind: "powerOff" }
  | { kind: "motorOn" }
  | { kind: "motorOnRejected" }
  | { kind: "motorOff" }
  | { kind: "speedChanged"; speed: number }
  | { kind: "speedRejectedNoPower" }
  | { kind: "speedRejectedNoMotor" }
  | { kind: "directionChanged"; rudder: number }
  | { kind: "directionRejected" }
  | { kind: "muted" }
  | { kind: "queryBattery" }
  | { kind: "querySpeed"; speed: number }
  | { kind: "queryTemperature" }
  | { kind: "queryDistance" }
  | { kind: "unknown" };

export interface ApplyCommandResult {
  state: BoatState;
  feedback: CommandFeedback;
}

export function applyCommand(state: BoatState, intentName: string, transcript: string, language: Language): ApplyCommandResult {
  switch (intentName) {
    case "system.powerOn":
      return { state: { ...state, powered: true }, feedback: { kind: "powerOn" } };

    case "system.powerOff":
      return { state: { ...state, powered: false, motorOn: false, speed: 0 }, feedback: { kind: "powerOff" } };

    case "system.motorOn":
      if (!state.powered) return { state, feedback: { kind: "motorOnRejected" } };
      return { state: { ...state, motorOn: true }, feedback: { kind: "motorOn" } };

    case "system.motorOff":
      return { state: { ...state, motorOn: false, speed: 0 }, feedback: { kind: "motorOff" } };

    case "speed.set": {
      if (!state.powered) return { state, feedback: { kind: "speedRejectedNoPower" } };
      if (!state.motorOn) return { state, feedback: { kind: "speedRejectedNoMotor" } };
      const parsed = parseNumber(transcript, language);
      if (parsed === null) return { state, feedback: { kind: "unknown" } };
      const speed = clamp(roundTo5(parsed), 0, SPEED_MAX);
      return { state: { ...state, speed }, feedback: { kind: "speedChanged", speed } };
    }

    case "speed.increase": {
      if (!state.powered) return { state, feedback: { kind: "speedRejectedNoPower" } };
      if (!state.motorOn) return { state, feedback: { kind: "speedRejectedNoMotor" } };
      const parsed = parseNumber(transcript, language);
      const delta = parsed !== null ? roundTo5(parsed) : SPEED_DEFAULT_STEP;
      const speed = clamp(state.speed + delta, 0, SPEED_MAX);
      return { state: { ...state, speed }, feedback: { kind: "speedChanged", speed } };
    }

    case "speed.decrease": {
      if (!state.powered) return { state, feedback: { kind: "speedRejectedNoPower" } };
      if (!state.motorOn) return { state, feedback: { kind: "speedRejectedNoMotor" } };
      const parsed = parseNumber(transcript, language);
      const delta = parsed !== null ? roundTo5(parsed) : SPEED_DEFAULT_STEP;
      const speed = clamp(state.speed - delta, 0, SPEED_MAX);
      return { state: { ...state, speed }, feedback: { kind: "speedChanged", speed } };
    }

    case "speed.stop":
      return { state: { ...state, speed: 0 }, feedback: { kind: "speedChanged", speed: 0 } };

    case "direction.left": {
      if (!state.powered) return { state, feedback: { kind: "directionRejected" } };
      const rudder = clamp(state.rudder - RUDDER_DEFAULT_STEP, -RUDDER_MAX, RUDDER_MAX);
      return { state: { ...state, rudder }, feedback: { kind: "directionChanged", rudder } };
    }

    case "direction.leftBy": {
      if (!state.powered) return { state, feedback: { kind: "directionRejected" } };
      const parsed = parseNumber(transcript, language);
      const delta = parsed !== null ? roundTo5(parsed) : RUDDER_DEFAULT_STEP;
      const rudder = clamp(state.rudder - delta, -RUDDER_MAX, RUDDER_MAX);
      return { state: { ...state, rudder }, feedback: { kind: "directionChanged", rudder } };
    }

    case "direction.right": {
      if (!state.powered) return { state, feedback: { kind: "directionRejected" } };
      const rudder = clamp(state.rudder + RUDDER_DEFAULT_STEP, -RUDDER_MAX, RUDDER_MAX);
      return { state: { ...state, rudder }, feedback: { kind: "directionChanged", rudder } };
    }

    case "direction.rightBy": {
      if (!state.powered) return { state, feedback: { kind: "directionRejected" } };
      const parsed = parseNumber(transcript, language);
      const delta = parsed !== null ? roundTo5(parsed) : RUDDER_DEFAULT_STEP;
      const rudder = clamp(state.rudder + delta, -RUDDER_MAX, RUDDER_MAX);
      return { state: { ...state, rudder }, feedback: { kind: "directionChanged", rudder } };
    }

    case "direction.center": {
      if (!state.powered) return { state, feedback: { kind: "directionRejected" } };
      return { state: { ...state, rudder: 0 }, feedback: { kind: "directionChanged", rudder: 0 } };
    }

    case "system.mute":
      return { state, feedback: { kind: "muted" } };

    case "status.battery":
      return { state, feedback: { kind: "queryBattery" } };

    case "status.speed":
      return { state, feedback: { kind: "querySpeed", speed: state.speed } };

    case "status.temperature":
      return { state, feedback: { kind: "queryTemperature" } };

    case "status.distance":
      return { state, feedback: { kind: "queryDistance" } };

    default:
      return { state, feedback: { kind: "unknown" } };
  }
}
