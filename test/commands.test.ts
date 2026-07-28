import { describe, expect, it } from "vitest";
import { buildVoskVocabulary, matchIntent } from "../src/commands.js";

describe("matchIntent", () => {
  it("matches a known keyword", () => {
    expect(matchIntent("qual a bateria agora", "pt").name).toBe("status.battery");
  });

  it("is case-insensitive", () => {
    expect(matchIntent("QUAL A VELOCIDADE", "pt").name).toBe("status.speed");
  });

  it("returns unknown for unmatched transcripts", () => {
    const intent = matchIntent("bom dia", "pt");
    expect(intent.name).toBe("unknown");
    expect(intent.confidence).toBe(0);
  });

  it("matches commands across every category", () => {
    expect(matchIntent("por favor acelerar um pouco", "pt").name).toBe("speed.increase");
    expect(matchIntent("vira para a esquerda agora", "pt").name).toBe("direction.left");
    expect(matchIntent("ligar o motor", "pt").name).toBe("system.motorOn");
    expect(matchIntent("qual a temperatura do motor", "pt").name).toBe("status.temperature");
  });

  it("ignores accents when matching", () => {
    expect(matchIntent("qual a distancia percorrida", "pt").name).toBe("status.distance");
  });

  it("matches English phrases only in English, not mixed with Portuguese", () => {
    expect(matchIntent("please speed up now", "en").name).toBe("speed.increase");
    expect(matchIntent("turn left", "en").name).toBe("direction.left");
    expect(matchIntent("speed up", "pt").name).toBe("unknown");
    expect(matchIntent("acelerar", "en").name).toBe("unknown");
  });

  it("matches the bare noun, with or without an article, singular or plural", () => {
    expect(matchIntent("bateria", "pt").name).toBe("status.battery");
    expect(matchIntent("as baterias estão boas?", "pt").name).toBe("status.battery");
    expect(matchIntent("temperatura", "pt").name).toBe("status.temperature");
  });

  it("matches nautical terms for direction", () => {
    expect(matchIntent("estibordo", "pt").name).toBe("direction.right");
    expect(matchIntent("boreste", "pt").name).toBe("direction.right");
    expect(matchIntent("bombordo", "pt").name).toBe("direction.left");
    expect(matchIntent("port side", "en").name).toBe("direction.left");
    expect(matchIntent("starboard", "en").name).toBe("direction.right");
  });

  it("matches a bare 'velocidade N' / 'speed N' as speed.set, not a telemetry query", () => {
    expect(matchIntent("velocidade 30", "pt").name).toBe("speed.set");
    expect(matchIntent("velocidade 5", "pt").name).toBe("speed.set");
    expect(matchIntent("speed 30", "en").name).toBe("speed.set");
    // No trailing number — still a telemetry query, not speed.set.
    expect(matchIntent("qual a velocidade", "pt").name).toBe("status.speed");
    expect(matchIntent("velocidade", "pt").name).toBe("status.speed");
  });

  it("keeps a verb-based number ('aumentar velocidade 20') as increase/decrease, not speed.set", () => {
    expect(matchIntent("aumentar velocidade 20", "pt").name).toBe("speed.increase");
    expect(matchIntent("diminuir velocidade 20", "pt").name).toBe("speed.decrease");
    expect(matchIntent("increase speed 20", "en").name).toBe("speed.increase");
  });

  it("matches a spelled-out number for speed.set too", () => {
    expect(matchIntent("velocidade trinta e cinco", "pt").name).toBe("speed.set");
    expect(matchIntent("speed thirty five", "en").name).toBe("speed.set");
  });
});

describe("buildVoskVocabulary", () => {
  it("includes every phrase word, number words/digits, and the [unk] catch-all", () => {
    const vocab = buildVoskVocabulary("pt");
    expect(vocab).toContain("bateria");
    expect(vocab).toContain("esquerda");
    expect(vocab).toContain("trinta");
    expect(vocab).toContain("45");
    expect(vocab).toContain("[unk]");
    // No duplicates.
    expect(new Set(vocab).size).toBe(vocab.length);
  });

  it("doesn't mix languages", () => {
    const pt = buildVoskVocabulary("pt");
    const en = buildVoskVocabulary("en");
    expect(pt).not.toContain("battery");
    expect(en).not.toContain("bateria");
  });
});
