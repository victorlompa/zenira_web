import { describe, expect, it } from "vitest";
import { matchIntent } from "../src/commands.js";

describe("matchIntent", () => {
  it("matches a known keyword", () => {
    expect(matchIntent("qual a bateria agora").name).toBe("status.battery");
  });

  it("is case-insensitive", () => {
    expect(matchIntent("QUAL A VELOCIDADE").name).toBe("status.speed");
  });

  it("returns unknown for unmatched transcripts", () => {
    const intent = matchIntent("bom dia");
    expect(intent.name).toBe("unknown");
    expect(intent.confidence).toBe(0);
  });
});
