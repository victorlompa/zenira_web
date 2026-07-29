import { NUMBER_WORDS, normalizeText, parseNumber } from "./numbers.js";
import type { Intent, Language } from "./types.js";

/**
 * Illustrative command grammar for the demo — NOT the production MCV25
 * command set (that logic lives in the car's control firmware, not here).
 * Each command lists several ways to phrase it, kept separate per language
 * so matching (and the command library UI, `web/src/CommandLibrary.tsx`)
 * never mixes a Portuguese phrase into an English session or vice versa —
 * they stay in sync with whichever language Vosk is currently transcribing.
 */
export type CommandCategory = "speed" | "direction" | "command" | "telemetry";

export interface CommandDefinition {
  name: string;
  category: CommandCategory;
  /** Several ways of saying the same command, per language — used for both matching and display. */
  phrases: Record<Language, string[]>;
  /**
   * Display-only override for the command library UI (`web/src/CommandLibrary.tsx`).
   * Only set for commands that accept a spoken number (see `numberNote`) — lets the
   * library show a single "...para X" placeholder instead of every literal number
   * word, without touching `phrases`, which still needs the real words for matching.
   */
  displayPhrases?: Record<Language, string[]>;
  /** Shown under the phrase list when a command accepts a number — see `NUMBER_WORDS` for the actual accepted values/step. */
  numberNote?: Record<Language, string>;
  /**
   * True for a command that's only ever reached via another command's
   * redirect in `matchIntent` (e.g. direction.leftBy/rightBy) — its own
   * `phrases` exist solely to feed `buildVoskVocabulary` and give the
   * command library a row to render, and must be skipped by `matchIntent`'s
   * matching loop. Without this, a marker word like "graus" would match on
   * its own regardless of which direction was actually said.
   */
  displayOnly?: boolean;
}

export const commands: CommandDefinition[] = [
  // Velocidade / speed
  {
    name: "speed.increase",
    category: "speed",
    phrases: {
      pt: ["aumentar velocidade", "aumentar a velocidade", "acelerar", "acelera", "aumenta a velocidade", "mais rápido"],
      en: ["increase speed", "speed up", "accelerate", "go faster"],
    },
  },
  {
    name: "speed.decrease",
    category: "speed",
    phrases: {
      pt: ["diminuir velocidade", "diminuir a velocidade", "desacelerar", "desacelera", "reduz a velocidade", "mais devagar"],
      en: ["decrease speed", "slow down", "decelerate", "go slower"],
    },
  },
  {
    name: "speed.set",
    category: "speed",
    phrases: {
      pt: [
        "mudar velocidade para dez",
        "mudar a velocidade para dez",
        "definir velocidade em dez",
        "definir a velocidade em dez",
        "ajustar velocidade para dez",
        "ajustar a velocidade para dez",
        "coloca a velocidade em dez",
        "coloca a velocidade para dez",
        "velocidade para dez",
        "velocidade dez",
      ],
      en: ["change speed to ten", "set speed to", "adjust speed to", "speed to", "speed 30"],
    },
    displayPhrases: {
      pt: [
        "mudar velocidade para X",
        "mudar a velocidade para X",
        "definir velocidade em X",
        "definir a velocidade em X",
        "ajustar velocidade para X",
        "ajustar a velocidade para X",
        "coloca a velocidade em X",
        "coloca a velocidade para X",
        "velocidade para X",
        "velocidade X",
      ],
      en: ["change speed to X", "set speed to X", "adjust speed to X", "speed to X", "speed X"],
    },
    numberNote: {
      pt: "Aceita qualquer valor de 0 a 100, em variações de 5 em 5.",
      en: "Accepts any value from 0 to 100, in steps of 5.",
    },
  },
  {
    name: "speed.stop",
    category: "speed",
    phrases: {
      pt: ["parar", "parar o barco", "para o barco", "freiar", "freia"],
      en: ["stop", "stop the boat", "brake"],
    },
  },

  // Direção / direction — includes standard nautical terms (estibordo/boreste
  // = starboard/right, bombordo = port/left).
  {
    name: "direction.left",
    category: "direction",
    phrases: {
      pt: ["virar à esquerda", "virar para esquerda", "vira para a esquerda", "esquerda", "dobrar à esquerda", "bombordo"],
      en: ["turn left", "steer left", "left", "go left", "port side"],
    },
  },
  // Same phrases as direction.left, plus "graus"/"degrees" so Vosk's vocabulary
  // includes them. displayOnly: true keeps matchIntent from ever matching
  // this entry directly — otherwise the bare "graus" phrase would match on
  // its own (e.g. "virar quinze graus direita" would wrongly hit this one
  // before direction.right ever got a chance). This entry only exists so
  // matchIntent's redirect below has a distinct intent name to return, and
  // so the command library can list it as its own row with its own numberNote.
  {
    name: "direction.leftBy",
    category: "direction",
    displayOnly: true,
    phrases: {
      pt: ["virar à esquerda", "virar para esquerda", "vira para a esquerda", "esquerda", "dobrar à esquerda", "bombordo", "graus"],
      en: ["turn left", "steer left", "left", "go left", "port side", "degrees"],
    },
    displayPhrases: {
      pt: ["virar à esquerda X graus", "vira X graus à esquerda", "esquerda X graus"],
      en: ["turn left X degrees", "left X degrees"],
    },
    numberNote: {
      pt: "Aceita um valor de graus dito pelo usuário, de 5 em 5 (substitui o padrão de 10°).",
      en: "Accepts a spoken degree value, in steps of 5 (overrides the default 10°).",
    },
  },
  {
    name: "direction.right",
    category: "direction",
    phrases: {
      pt: [
        "virar à direita",
        "virar para direita",
        "vira para a direita",
        "direita",
        "dobrar à direita",
        "estibordo",
        "boreste",
      ],
      en: ["turn right", "steer right", "right", "go right", "starboard"],
    },
  },
  // See the comment on direction.leftBy above — same reasoning, mirrored for the right side.
  {
    name: "direction.rightBy",
    category: "direction",
    displayOnly: true,
    phrases: {
      pt: ["virar à direita", "virar para direita", "vira para a direita", "direita", "dobrar à direita", "estibordo", "boreste", "graus"],
      en: ["turn right", "steer right", "right", "go right", "starboard", "degrees"],
    },
    displayPhrases: {
      pt: ["virar à direita X graus", "vira X graus à direita", "direita X graus"],
      en: ["turn right X degrees", "right X degrees"],
    },
    numberNote: {
      pt: "Aceita um valor de graus dito pelo usuário, de 5 em 5 (substitui o padrão de 10°).",
      en: "Accepts a spoken degree value, in steps of 5 (overrides the default 10°).",
    },
  },
  {
    name: "direction.center",
    category: "direction",
    phrases: {
      pt: ["centralizar", "centraliza a direção", "centraliza a rabeta", "endireitar", "endireita", "voltar ao centro", "volta ao centro"],
      en: ["center steering", "center the rudder", "straighten", "back to center"],
    },
  },

  // Comando / system command
  {
    name: "system.powerOn",
    category: "command",
    phrases: {
      pt: ["ligar barco", "ligar o barco", "liga o barco", "iniciar sistema", "inicia o sistema", "ligar zenira", "liga a zenira"],
      en: ["power on", "turn on the boat", "start system", "power up"],
    },
  },
  {
    name: "system.powerOff",
    category: "command",
    phrases: {
      pt: [
        "desligar barco",
        "desligar o barco",
        "desliga o barco",
        "desligar sistema",
        "desliga o sistema",
        "encerrar sistema",
        "encerra o sistema",
      ],
      en: ["power off", "turn off the boat", "shut down system", "shut down"],
    },
  },
  {
    name: "system.motorOn",
    category: "command",
    phrases: {
      pt: ["ligar motor", "ligar o motor", "liga o motor", "acionar motor", "aciona o motor", "dar partida", "da partida"],
      en: ["start engine", "turn on the motor", "start the motor", "engine on"],
    },
  },
  {
    name: "system.motorOff",
    category: "command",
    phrases: {
      pt: ["desligar motor", "desligar o motor", "desliga o motor", "parar motor", "para o motor", "cortar motor", "corta o motor"],
      en: ["kill engine", "turn off the motor", "stop the motor", "engine off"],
    },
  },
  {
    name: "system.mute",
    category: "command",
    phrases: {
      pt: ["silêncio", "silencio", "mudo", "silenciar", "fica em silêncio"],
      en: ["mute", "silence", "quiet"],
    },
  },

  // Telemetria / telemetry — includes the bare noun (singular and plural),
  // with and without an article, not just the full "qual a X" phrasing.
  {
    name: "status.battery",
    category: "telemetry",
    phrases: {
      pt: [
        "qual a bateria",
        "qual bateria",
        "nível de bateria",
        "nível da bateria",
        "status da bateria",
        "status das baterias",
        "quanto tem de bateria",
        "baterias",
        "bateria",
      ],
      en: ["battery status", "battery level", "how much battery", "check battery", "batteries", "battery"],
    },
  },
  {
    name: "status.speed",
    category: "telemetry",
    phrases: {
      pt: ["qual a velocidade", "velocidade atual", "status da velocidade", "quão rápido estamos", "velocidade"],
      en: ["current speed", "speed status", "how fast are we", "check speed", "speed"],
    },
  },
  {
    name: "status.temperature",
    category: "telemetry",
    phrases: {
      pt: ["qual a temperatura", "temperatura do motor", "está quente", "temperatura"],
      en: ["temperature status", "engine temperature", "is it hot", "temperature"],
    },
  },
  {
    name: "status.distance",
    category: "telemetry",
    phrases: {
      pt: ["qual a distância", "distância percorrida", "quanto já andamos", "distância"],
      en: ["distance traveled", "how far have we gone", "check distance", "distance"],
    },
  },
];

const UNKNOWN_INTENT: Intent = { name: "unknown", confidence: 0 };

export function matchIntent(transcript: string, language: Language): Intent {
  const normalized = normalizeText(transcript);

  for (const command of commands) {
    if (command.displayOnly) continue; // only reachable via another command's redirect below
    const hit = command.phrases[language].some((phrase) => normalized.includes(normalizeText(phrase)));
    if (hit) {
      // Bare "velocidade 30" / "speed 30" (no verb) lands here via
      // status.speed's bare-word phrase — but a number right after means
      // "set the speed", not "what's the current speed". Phrasings with a
      // verb ("aumentar velocidade 20", "mudar velocidade para 50") never
      // reach this: they already matched speed.increase/decrease/set above,
      // since the speed category is checked before telemetry.
      if (command.name === "status.speed" && parseNumber(transcript, language) !== null) {
        return { name: "speed.set", confidence: 1 };
      }
      // Same idea for direction: "virar à esquerda" alone is the fixed 10°
      // nudge, but a spoken number anywhere in the phrase ("virar à esquerda
      // 20", "20 graus à esquerda") means the user gave their own amount —
      // reaching direction.leftBy/rightBy never happens via their own
      // phrases (direction.left/right already matched first), only via this
      // redirect.
      if (command.name === "direction.left" && parseNumber(transcript, language) !== null) {
        return { name: "direction.leftBy", confidence: 1 };
      }
      if (command.name === "direction.right" && parseNumber(transcript, language) !== null) {
        return { name: "direction.rightBy", confidence: 1 };
      }
      return { name: command.name, confidence: 1 };
    }
  }

  return UNKNOWN_INTENT;
}

/**
 * A word-level vocabulary for Vosk's constrained-grammar mode
 * (`KaldiRecognizer(sampleRate, grammar)`), built from every phrase in the
 * library plus the number words commands accept — restricting the decoder
 * to just these words measurably improves accuracy for a fixed command set
 * versus open-vocabulary transcription. `[unk]` is included so speech that
 * doesn't match anything here comes back as an explicit non-match instead
 * of being force-fit onto the nearest known word.
 */
export function buildVoskVocabulary(language: Language): string[] {
  const words = new Set<string>();
  for (const command of commands) {
    for (const phrase of command.phrases[language]) {
      for (const word of phrase.split(/\s+/)) words.add(word);
    }
  }
  for (const word of Object.keys(NUMBER_WORDS[language])) {
    for (const part of word.split(/\s+/)) words.add(part);
  }
  for (let n = 0; n <= 100; n += 5) words.add(String(n));
  words.add("[unk]");
  return [...words];
}
