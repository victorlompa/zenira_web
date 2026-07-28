import type { CommandCategory } from "../../src/commands.ts";
import type { Language, PipelineState } from "../../src/types.ts";

export interface Strings {
  toggleDarkMode: string;
  status: Record<PipelineState["status"], string>;
  micLabel: string;
  micNoTrack: string;
  micDeviceLabel: string;
  micDeviceDefault: string;
  wakeWordScoresLabel: string;
  transcriptLabel: string;
  idlePlaceholder: string;
  outputLabel: string;
  outputPlaceholder: string;
  infoLabel: string;
  infoMic: string;
  infoWakeWordScores: string;
  infoTranscript: string;
  infoOutput: string;
  infoLibrary: string;
  infoBoat: string;
  infoHistory: string;
  triggerWakeWord: string;
  start: string;
  stop: string;
  micDenied: string;
  idleNote: string;
  note: (realWakeWord: boolean, realStt: boolean, language: Language) => string;
  libraryTitle: string;
  categoryLabel: Record<CommandCategory, string>;
  historyTitle: string;
  historyEmpty: string;
  historyUnknown: string;
  tabZenira: string;
  tabLibrary: string;
  tabHistory: string;
  boatTitle: string;
  boatSpeedLabel: string;
  boatBoatLabel: string;
  boatMotorLabel: string;
  boatOn: string;
  boatOff: string;
  boatRudderLabel: string;
  boatLeft: string;
  boatCenter: string;
  boatRight: string;
  boatBatteryLabel: string;
  boatCurrentLabel: string;
  fbPowerOn: string;
  fbPowerOff: string;
  fbMotorOn: string;
  fbMotorOnRejected: string;
  fbMotorOff: string;
  fbSpeedChanged: (speed: number) => string;
  fbSpeedRejectedNoPower: string;
  fbSpeedRejectedNoMotor: string;
  fbDirectionChanged: (label: string) => string;
  fbDirectionRejected: string;
  fbMuted: string;
  fbQueryBattery: (voltage: number) => string;
  fbQuerySpeed: (speed: number) => string;
  fbQueryTemperature: (temperature: number) => string;
  fbQueryDistance: (distanceKm: number) => string;
  fbUnknown: string;
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
    idlePlaceholder: "Press “Start listening” below to grant microphone access.",
    triggerWakeWord: "Trigger wake word",
    start: "Start listening",
    stop: "Stop",
    micDenied: "Microphone access denied — Zenira needs it to detect the wake word.",
    outputLabel: "Output",
    outputPlaceholder: "Nothing to report yet.",
    infoLabel: "Info",
    infoMic: "Live waveform from the raw microphone signal, so you can confirm audio is actually being captured before blaming the wake-word or speech-to-text engines.",
    infoWakeWordScores: "Live confidence from the Edge Impulse wake-word model for each of its classes, updated a few times per second while armed.",
    infoTranscript: "What Vosk is transcribing live, in the language you picked. It only shows up once the wake word has fired and Zenira is actively listening for a command.",
    infoOutput: "The result of the last recognized command — what changed, or why it was rejected (e.g. an interlock like \"turn on the boat first\").",
    infoLibrary: "Every demo voice command, grouped by category. Pick a category, then a command, to see all the ways you can phrase it.",
    infoBoat: "A simplified view of the boat driven by recognized commands — speed, rudder, power switches — plus simulated battery/engine telemetry.",
    infoHistory: "Every command Zenira has recognized (or failed to), most recent first, 5 per page.",
    idleNote:
      "Zenira runs the whole wake-word + speech-to-text pipeline in your browser — nothing is sent to a " +
      "server. Pick a language above, then press “Start listening”.",
    note: (realWakeWord, realStt, language) =>
      `Wake word: ${realWakeWord ? "real Edge Impulse model" : "mocked — trigger it manually below"}. ` +
      `Speech-to-text: ${realStt ? "real Vosk model, entirely client-side" : "mocked fixed transcript"}` +
      `${realStt ? ` (${LANGUAGE_NAME[language]})` : ""}. Audio never leaves your device. ` +
      "See README.md to wire in the remaining mocked engine.",
    libraryTitle: "Command library",
    categoryLabel: {
      speed: "Speed",
      direction: "Direction",
      command: "Command",
      telemetry: "Telemetry",
    },
    historyTitle: "History",
    historyEmpty: "No commands recognized yet.",
    historyUnknown: "not recognized",
    tabZenira: "Zenira",
    tabLibrary: "Commands",
    tabHistory: "History",
    boatTitle: "Boat panel",
    boatSpeedLabel: "Speed",
    boatBoatLabel: "Boat",
    boatMotorLabel: "Motor",
    boatOn: "On",
    boatOff: "Off",
    boatRudderLabel: "Rudder",
    boatLeft: "Left",
    boatCenter: "Center",
    boatRight: "Right",
    boatBatteryLabel: "Main battery",
    boatCurrentLabel: "Current",
    fbPowerOn: "Boat powered on.",
    fbPowerOff: "Boat powered off.",
    fbMotorOn: "Engine started.",
    fbMotorOnRejected: "Turn on the boat to start the engine.",
    fbMotorOff: "Engine stopped.",
    fbSpeedChanged: (speed) => `Speed changed to ${Math.round(speed)}.`,
    fbSpeedRejectedNoPower: "Turn on the boat to change speed.",
    fbSpeedRejectedNoMotor: "You need to start the engine to change speed.",
    fbDirectionChanged: (label) => `Steering set to ${label}.`,
    fbDirectionRejected: "Turn on the boat to steer.",
    fbMuted: "Audio muted.",
    fbQueryBattery: (voltage) => `Battery voltage: ${voltage.toFixed(1)} V.`,
    fbQuerySpeed: (speed) => `Current speed: ${Math.round(speed)}.`,
    fbQueryTemperature: (temperature) => `Engine temperature: ${temperature.toFixed(1)} °C.`,
    fbQueryDistance: (distanceKm) => `Distance traveled: ${distanceKm.toFixed(1)} km.`,
    fbUnknown: "Command not recognized.",
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
    idlePlaceholder: "Aperte “Iniciar escuta” abaixo para conceder acesso ao microfone.",
    triggerWakeWord: "Acionar palavra de ativação",
    start: "Iniciar escuta",
    stop: "Parar",
    micDenied: "Acesso ao microfone negado — a Zenira precisa dele para detectar a palavra de ativação.",
    outputLabel: "Resposta",
    outputPlaceholder: "Nada a reportar ainda.",
    infoLabel: "Informação",
    infoMic: "Forma de onda ao vivo do sinal cru do microfone, pra você confirmar que o áudio está sendo captado antes de suspeitar da wake word ou do reconhecimento de fala.",
    infoWakeWordScores: "Confiança ao vivo do modelo de palavra de ativação (Edge Impulse) pra cada classe, atualizada algumas vezes por segundo enquanto armado.",
    infoTranscript: "O que o Vosk está transcrevendo ao vivo, no idioma escolhido. Só aparece depois que a palavra de ativação dispara e a Zenira está de fato escutando um comando.",
    infoOutput: "O resultado do último comando reconhecido — o que mudou, ou por que foi rejeitado (por exemplo, uma interligação como \"ligue o barco primeiro\").",
    infoLibrary: "Todos os comandos de voz da demo, agrupados por categoria. Escolha uma categoria, depois um comando, pra ver todas as formas de dizê-lo.",
    infoBoat: "Uma visão simplificada do barco, controlada pelos comandos reconhecidos — velocidade, rabeta, chaves de força — além de telemetria simulada de bateria/motor.",
    infoHistory: "Todos os comandos que a Zenira já reconheceu (ou não), mais recente primeiro, 5 por página.",
    idleNote:
      "A Zenira roda todo o pipeline de palavra de ativação + fala-para-texto no seu navegador — nada é " +
      "enviado a um servidor. Escolha um idioma acima e aperte “Iniciar escuta”.",
    note: (realWakeWord, realStt, language) =>
      `Palavra de ativação: ${realWakeWord ? "modelo real do Edge Impulse" : "simulada — acione manualmente abaixo"}. ` +
      `Fala para texto: ${realStt ? "modelo real do Vosk, tudo no navegador" : "transcrição fixa simulada"}` +
      `${realStt ? ` (${LANGUAGE_NAME_PT[language]})` : ""}. O áudio nunca sai do seu dispositivo. ` +
      "Veja o README.md para ligar o motor que ainda está simulado.",
    libraryTitle: "Biblioteca de comandos",
    categoryLabel: {
      speed: "Velocidade",
      direction: "Direção",
      command: "Comando",
      telemetry: "Telemetria",
    },
    historyTitle: "Histórico",
    historyEmpty: "Nenhum comando reconhecido ainda.",
    historyUnknown: "não reconhecido",
    tabZenira: "Zenira",
    tabLibrary: "Comandos",
    tabHistory: "Histórico",
    boatTitle: "Painel do barco",
    boatSpeedLabel: "Velocidade",
    boatBoatLabel: "Barco",
    boatMotorLabel: "Motor",
    boatOn: "Ligado",
    boatOff: "Desligado",
    boatRudderLabel: "Rabeta",
    boatLeft: "Esquerda",
    boatCenter: "Centro",
    boatRight: "Direita",
    boatBatteryLabel: "Bateria principal",
    boatCurrentLabel: "Corrente",
    fbPowerOn: "Barco ligado.",
    fbPowerOff: "Barco desligado.",
    fbMotorOn: "Motor ligado.",
    fbMotorOnRejected: "Ligue o barco para ligar o motor.",
    fbMotorOff: "Motor desligado.",
    fbSpeedChanged: (speed) => `Velocidade alterada para ${Math.round(speed)}.`,
    fbSpeedRejectedNoPower: "Ligue o barco para alterar a velocidade.",
    fbSpeedRejectedNoMotor: "É necessário ligar o motor para alterar a velocidade.",
    fbDirectionChanged: (label) => `Direção ajustada: ${label}.`,
    fbDirectionRejected: "Ligue o barco para ajustar a direção.",
    fbMuted: "Áudio silenciado.",
    fbQueryBattery: (voltage) => `Tensão da bateria: ${voltage.toFixed(1)} V.`,
    fbQuerySpeed: (speed) => `Velocidade atual: ${Math.round(speed)}.`,
    fbQueryTemperature: (temperature) => `Temperatura do motor: ${temperature.toFixed(1)} °C.`,
    fbQueryDistance: (distanceKm) => `Distância percorrida: ${distanceKm.toFixed(1)} km.`,
    fbUnknown: "Comando não reconhecido.",
  },
};
