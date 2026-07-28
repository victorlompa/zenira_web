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
        "mudar velocidade para",
        "mudar a velocidade para",
        "definir velocidade em",
        "definir a velocidade em",
        "ajustar velocidade para",
        "ajustar a velocidade para",
        "coloca a velocidade em",
        "coloca a velocidade para",
        "velocidade para",
        "velocidade 30",
      ],
      en: ["change speed to", "set speed to", "adjust speed to", "speed to", "speed 30"],
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
