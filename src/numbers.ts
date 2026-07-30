import type { Language } from "./types.js";

export const NUMBER_WORDS: Record<Language, Record<string, number>> = {
  pt: {
    zero: 0,
    cinco: 5,
    dez: 10,
    quinze: 15,
    vinte: 20,
    "vinte e cinco": 25,
    "vinte cinco": 25,
    trinta: 30,
    "trinta e cinco": 35,
    "trinta cinco": 35,
    quarenta: 40,
    "quarenta e cinco": 45,
    "quarenta cinco": 45,
    cinquenta: 50,
    "cinquenta e cinco": 55,
    "cinquenta cinco": 55,
    sessenta: 60,
    "sessenta e cinco": 65,
    "sessenta cinco": 65,
    setenta: 70,
    "setenta e cinco": 75,
    "setenta cinco": 75,
    oitenta: 80,
    "oitenta e cinco": 85,
    "oitenta cinco": 85,
    noventa: 90,
    "noventa e cinco": 95,
    "noventa cinco": 95,
    cem: 100,
  },
  en: {
    zero: 0,
    five: 5,
    ten: 10,
    fifteen: 15,
    twenty: 20,
    "twenty five": 25,
    thirty: 30,
    "thirty five": 35,
    forty: 40,
    "forty five": 45,
    fifty: 50,
    "fifty five": 55,
    sixty: 60,
    "sixty five": 65,
    seventy: 70,
    "seventy five": 75,
    eighty: 80,
    "eighty five": 85,
    ninety: 90,
    "ninety five": 95,
    "one hundred": 100,
  },
};

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function parseNumber(transcript: string, language: Language): number | null {
  const normalized = normalizeText(transcript);

  const digitMatch = normalized.match(/\d+/);
  if (digitMatch) return Number(digitMatch[0]);

  const words = Object.entries(NUMBER_WORDS[language]).sort((a, b) => b[0].length - a[0].length);
  for (const [word, value] of words) {
    if (normalized.includes(word)) return value;
  }
  return null;
}
