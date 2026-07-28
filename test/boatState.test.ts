import { describe, expect, it } from "vitest";
import { applyCommand, INITIAL_BOAT_STATE } from "../src/boatState.js";

function apply(state: typeof INITIAL_BOAT_STATE, intentName: string, transcript: string) {
  return applyCommand(state, intentName, transcript, "pt");
}

describe("applyCommand", () => {
  it("motor can't start while the boat is off", () => {
    const { state, feedback } = apply(INITIAL_BOAT_STATE, "system.motorOn", "ligar motor");
    expect(state.motorOn).toBe(false);
    expect(feedback.kind).toBe("motorOnRejected");
  });

  it("motor starts once the boat is powered on", () => {
    let state = INITIAL_BOAT_STATE;
    ({ state } = apply(state, "system.powerOn", "ligar barco"));
    const result = apply(state, "system.motorOn", "ligar motor");
    expect(result.state.powered).toBe(true);
    expect(result.state.motorOn).toBe(true);
    expect(result.feedback.kind).toBe("motorOn");
  });

  it("speed can't change unless both the boat and motor are on", () => {
    let state = INITIAL_BOAT_STATE;
    let result = apply(state, "speed.set", "mudar velocidade para 50");
    expect(result.state.speed).toBe(0);
    expect(result.feedback.kind).toBe("speedRejectedNoPower");

    ({ state } = apply(state, "system.powerOn", "ligar barco"));
    result = apply(state, "speed.set", "mudar velocidade para 50");
    expect(result.state.speed).toBe(0);
    expect(result.feedback.kind).toBe("speedRejectedNoMotor");

    ({ state } = apply(state, "system.motorOn", "ligar motor"));
    result = apply(state, "speed.set", "mudar velocidade para 50");
    expect(result.state.speed).toBe(50);
    expect(result.feedback).toEqual({ kind: "speedChanged", speed: 50 });
  });

  it("rounds the target speed to the nearest 5 and clamps it to 0-100", () => {
    let state = INITIAL_BOAT_STATE;
    ({ state } = apply(state, "system.powerOn", "ligar barco"));
    ({ state } = apply(state, "system.motorOn", "ligar motor"));

    let result = apply(state, "speed.set", "mudar velocidade para 130");
    expect(result.state.speed).toBe(100);

    result = apply(state, "speed.set", "mudar velocidade para 43");
    expect(result.state.speed).toBe(45);
  });

  it("accepts speed as a spelled-out number, not just digits", () => {
    let state = INITIAL_BOAT_STATE;
    ({ state } = apply(state, "system.powerOn", "ligar barco"));
    ({ state } = apply(state, "system.motorOn", "ligar motor"));

    const result = apply(state, "speed.set", "velocidade trinta e cinco");
    expect(result.state.speed).toBe(35);
  });

  it("increase/decrease nudge by 10 by default, or by a spoken amount", () => {
    let state = INITIAL_BOAT_STATE;
    ({ state } = apply(state, "system.powerOn", "ligar barco"));
    ({ state } = apply(state, "system.motorOn", "ligar motor"));
    ({ state } = apply(state, "speed.set", "velocidade 50"));

    let result = apply(state, "speed.increase", "aumentar velocidade");
    expect(result.state.speed).toBe(60);

    result = apply(state, "speed.increase", "aumentar velocidade 20");
    expect(result.state.speed).toBe(70);

    result = apply(state, "speed.decrease", "diminuir velocidade 30");
    expect(result.state.speed).toBe(20);
  });

  it("powering the boat off also turns the motor and speed off", () => {
    let state = INITIAL_BOAT_STATE;
    ({ state } = apply(state, "system.powerOn", "ligar barco"));
    ({ state } = apply(state, "system.motorOn", "ligar motor"));
    ({ state } = apply(state, "speed.set", "mudar velocidade para 80"));

    const result = apply(state, "system.powerOff", "desligar barco");
    expect(result.state.powered).toBe(false);
    expect(result.state.motorOn).toBe(false);
    expect(result.state.speed).toBe(0);
  });

  it("turning the motor off does not power the boat off", () => {
    let state = INITIAL_BOAT_STATE;
    ({ state } = apply(state, "system.powerOn", "ligar barco"));
    ({ state } = apply(state, "system.motorOn", "ligar motor"));

    const result = apply(state, "system.motorOff", "desligar motor");
    expect(result.state.motorOn).toBe(false);
    expect(result.state.powered).toBe(true);
    expect(result.state.speed).toBe(0);
  });

  it("rudder can't change while the boat is off", () => {
    const { state, feedback } = apply(INITIAL_BOAT_STATE, "direction.left", "virar à esquerda");
    expect(state.rudder).toBe(0);
    expect(feedback.kind).toBe("directionRejected");
  });

  it("steers by 10 degrees by default, bounded to ±90, and recenters", () => {
    let state = INITIAL_BOAT_STATE;
    ({ state } = apply(state, "system.powerOn", "ligar barco"));
    ({ state } = apply(state, "direction.left", "virar à esquerda"));
    expect(state.rudder).toBe(-10);

    for (let i = 0; i < 10; i++) ({ state } = apply(state, "direction.left", "virar à esquerda"));
    expect(state.rudder).toBe(-90);

    ({ state } = apply(state, "direction.center", "centralizar"));
    expect(state.rudder).toBe(0);

    ({ state } = apply(state, "direction.right", "virar à direita"));
    expect(state.rudder).toBe(10);
  });

  it("steers by a specific spoken amount, rounded to the nearest 5", () => {
    let state = INITIAL_BOAT_STATE;
    ({ state } = apply(state, "system.powerOn", "ligar barco"));

    const result = apply(state, "direction.right", "virar à direita 43");
    expect(result.state.rudder).toBe(45);
  });

  it("reports query feedback for telemetry commands without changing state", () => {
    const battery = apply(INITIAL_BOAT_STATE, "status.battery", "qual a bateria");
    expect(battery.feedback.kind).toBe("queryBattery");
    expect(battery.state).toBe(INITIAL_BOAT_STATE);

    const speed = apply(INITIAL_BOAT_STATE, "status.speed", "qual a velocidade");
    expect(speed.feedback).toEqual({ kind: "querySpeed", speed: 0 });
  });

  it("falls back to unknown feedback for unrecognized intents", () => {
    const { feedback } = apply(INITIAL_BOAT_STATE, "unknown", "bom dia");
    expect(feedback.kind).toBe("unknown");
  });
});
