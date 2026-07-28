import type { Language, PipelineState } from "../../src/types.ts";

interface Strings {
  toggleDarkMode: string;
  status: Record<PipelineState["status"], string>;
  micLabel: string;
  micNoTrack: string;
  micDeviceLabel: string;
  micDeviceDefault: string;
  wakeWordScoresLabel: string;
  transcriptLabel: string;
  transcriptPlaceholder: string;
  idlePlaceholder: string;
  triggerWakeWord: string;
  start: string;
  stop: string;
  micDenied: string;
  idleNote: string;
  note: (realWakeWord: boolean, realStt: boolean, language: Language) => string;
}

const LANGUAGE_NAME: Record<Language, string> = { pt: "Portuguese", en: "English" };
const LANGUAGE_NAME_PT: Record<Language, string> = { pt: "português", en: "inglês" };

export const STRINGS: Record<Language, Strings> = {
  en: {
    toggleDarkMode: "Toggle dark mode",
    status: {
      idle: "Idle",
      armed: "Armed",
      listening: "Transcribing…",
    },
    micLabel: "Microphone input",
    micNoTrack: "No audio track on this MediaStream — only video/no permission was granted.",
    micDeviceLabel: "Microphone",
    micDeviceDefault: "System default",
    wakeWordScoresLabel: "Wake word confidence",
    transcriptLabel: "Transcript",
    transcriptPlaceholder: "Click “Trigger wake word” to start.",
    idlePlaceholder: "Press “Start listening” below to grant microphone access.",
    triggerWakeWord: "Trigger wake word",
    start: "Start listening",
    stop: "Stop",
    micDenied: "Microphone access denied — Zenira needs it to detect the wake word.",
    idleNote:
      "Zenira runs the whole wake-word + speech-to-text pipeline in your browser — nothing is sent to a " +
      "server. Pick a language above, then press “Start listening”.",
    note: (realWakeWord, realStt, language) =>
      `Wake word: ${realWakeWord ? "real Edge Impulse model" : "mocked — trigger it manually below"}. ` +
      `Speech-to-text: ${realStt ? "real Vosk model, entirely client-side" : "mocked fixed transcript"}` +
      `${realStt ? ` (${LANGUAGE_NAME[language]})` : ""}. Audio never leaves your device. ` +
      "See README.md to wire in the remaining mocked engine.",
  },
  pt: {
    toggleDarkMode: "Alternar modo escuro",
    status: {
      idle: "Ocioso",
      armed: "Armado",
      listening: "Transcrevendo…",
    },
    micLabel: "Entrada do microfone",
    micNoTrack: "Nenhuma trilha de áudio nesse MediaStream — só vídeo, ou a permissão não foi concedida.",
    micDeviceLabel: "Microfone",
    micDeviceDefault: "Padrão do sistema",
    wakeWordScoresLabel: "Confiança da palavra de ativação",
    transcriptLabel: "Transcrição",
    transcriptPlaceholder: "Clique em “Acionar palavra de ativação” para começar.",
    idlePlaceholder: "Aperte “Iniciar escuta” abaixo para conceder acesso ao microfone.",
    triggerWakeWord: "Acionar palavra de ativação",
    start: "Iniciar escuta",
    stop: "Parar",
    micDenied: "Acesso ao microfone negado — a Zenira precisa dele para detectar a palavra de ativação.",
    idleNote:
      "A Zenira roda todo o pipeline de palavra de ativação + fala-para-texto no seu navegador — nada é " +
      "enviado a um servidor. Escolha um idioma acima e aperte “Iniciar escuta”.",
    note: (realWakeWord, realStt, language) =>
      `Palavra de ativação: ${realWakeWord ? "modelo real do Edge Impulse" : "simulada — acione manualmente abaixo"}. ` +
      `Fala para texto: ${realStt ? "modelo real do Vosk, tudo no navegador" : "transcrição fixa simulada"}` +
      `${realStt ? ` (${LANGUAGE_NAME_PT[language]})` : ""}. O áudio nunca sai do seu dispositivo. ` +
      "Veja o README.md para ligar o motor que ainda está simulado.",
  },
};
