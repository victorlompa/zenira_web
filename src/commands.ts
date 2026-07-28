import type { Intent } from "./types.js";

/**
 * Illustrative command grammar for the demo — NOT the production MCV25
 * command set (that logic lives in the car's control firmware, not here).
 * Keyword matching is intentionally simple; it only needs to show the
 * wake-word -> transcript -> intent flow end to end.
 */
export interface CommandDefinition {
  name: string;
  keywords: string[];
}

export const commands: CommandDefinition[] = [
  { name: "status.battery", keywords: ["bateria", "battery"] },
  { name: "status.speed", keywords: ["velocidade", "speed"] },
  { name: "system.mute", keywords: ["silencio", "silêncio", "mute"] },
];

const UNKNOWN_INTENT: Intent = { name: "unknown", confidence: 0 };

export function matchIntent(transcript: string): Intent {
  const normalized = transcript.toLowerCase();

  for (const command of commands) {
    const hit = command.keywords.some((keyword) => normalized.includes(keyword));
    if (hit) {
      return { name: command.name, confidence: 1 };
    }
  }

  return UNKNOWN_INTENT;
}
