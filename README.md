# Zenira — voice pipeline demo

Browser demo of the voice-control pipeline from [MCV25](https://github.com/ZeniteSolar/MCV25)
("Zenira"), the offline wake-word + speech-to-text module built for the
ZeniteSolar solar car. The production module runs on a Raspberry Pi in
C/C++ (CMake, Edge Impulse SDK for the wake word, Vosk for transcription).
This repo re-implements the same pipeline shape to run **entirely
client-side in the browser**, using the same two ML engines exported to
WebAssembly.

## Architecture

Same split as [everyday_puzzle](../everyday_puzzle): framework-free core +
thin web UI.

- `src/` — the pipeline itself: a state machine (`idle` → `armed` →
  `listening` → `command`) plus intent matching, written against
  `WakeWordDetector` / `SpeechRecognizer` interfaces (`src/types.ts`) so it
  doesn't care whether those are backed by real WASM models or test
  doubles. Tested with Vitest (`npm test`), no browser required.
- `web/` — Vite + React app that renders pipeline state and requests mic
  access. It wires the pipeline to either the mocked engines
  (`src/mock/mockEngines.ts`) or the real ones
  (`web/src/engines/edgeImpulseWakeWord.ts`,
  `web/src/engines/voskRecognizer.ts`), switched by the `usingRealEngines`
  flag in `web/src/engines/index.ts`.

Right now `usingRealEngines` is `false` — the app runs today with mocked
engines (a fake wake-word timer and a canned transcript) so the full flow
is visible without any model files. Each engine stub has a comment block
with the exact steps to swap in the real thing.

## Wiring in the real engines

1. **Wake word** — export the trained impulse from Edge Impulse Studio with
   deployment target "WebAssembly", drop the build in
   `web/public/models/`, and implement `EdgeImpulseWakeWordDetector`
   (`web/src/engines/edgeImpulseWakeWord.ts`).
2. **Speech-to-text** — `npm install vosk-browser` in `web/`, download the
   small Vosk model (~40MB — the 1.8GB full model isn't practical for the
   browser) into `web/public/models/`, and implement
   `VoskSpeechRecognizer` (`web/src/engines/voskRecognizer.ts`).
3. Flip `usingRealEngines` to `true` in `web/src/engines/index.ts`.

Once both are wired in, the whole pipeline — wake word detection and
transcription — runs in the visitor's browser; no audio is sent to any
server. Worth calling that out on the demo page itself.

## Legal note

- The Edge Impulse SDK is BSD-3-Clause-Clear; the trained model ("Output")
  is owned by the account that trained it, and WebAssembly is one of Edge
  Impulse's own supported deployment targets — publishing your own export
  is the intended use of the feature, not a gray area. Free-tier projects
  are private by default, so nothing is exposed unless you opt in.
- Vosk models are Apache-2.0 (Copyright Alpha Cephei Inc.) — no
  restriction on redistribution.

## Deploy

Static build (`web/dist` after `npm run build` inside `web/`), deployed
standalone on its own subdomain (e.g. `zenira.victorlompa.com`) via
Cloudflare, and linked from the portfolio's Work section rather than
bundled into it.

## Commands

```bash
npm install       # core deps, at repo root
npm test          # vitest, core pipeline + intent matching
npm run typecheck

cd web
npm install
npm run dev        # local dev server
npm run build       # type-check + production build
npm run lint         # oxlint
```
