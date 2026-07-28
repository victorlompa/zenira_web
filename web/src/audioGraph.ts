/**
 * A MediaStream's audio should only ever be tapped by ONE AudioContext +
 * MediaStreamAudioSourceNode, shared by every consumer (the level meter,
 * Vosk). Handing each consumer its own AudioContext against the same track
 * is a known source of flakiness in Chromium — the second context to
 * attach can end up starved of real samples, which looks exactly like "the
 * mic isn't being captured" while the track itself is perfectly fine.
 *
 * Each caller must disconnect only the node it created, using
 * `source.disconnect(thatNode)` — never a bare `source.disconnect()`,
 * which would also sever every other consumer sharing this source.
 */
interface SharedAudio {
  context: AudioContext;
  source: MediaStreamAudioSourceNode;
}

const registry = new Map<MediaStream, SharedAudio>();

export function getSharedAudioSource(stream: MediaStream): SharedAudio {
  let entry = registry.get(stream);
  if (!entry) {
    // Both Vosk and the Edge Impulse wake-word model are trained at 16kHz.
    // Vosk resamples internally (it's told the context's real rate), but
    // Edge Impulse's classifyContinuous() has no sample-rate parameter — it
    // just assumes whatever raw samples it's given are already at 16kHz. So
    // the context itself has to run at 16kHz, not the browser's usual
    // 44.1/48kHz default, or wake-word detection would silently see audio
    // sped up ~3x and never match anything.
    const context = new AudioContext({ sampleRate: 16000 });
    const source = context.createMediaStreamSource(stream);
    entry = { context, source };
    registry.set(stream, entry);
  }
  void entry.context.resume();
  return entry;
}

export function releaseSharedAudioSource(stream: MediaStream): void {
  const entry = registry.get(stream);
  if (!entry) return;
  registry.delete(stream);
  entry.source.disconnect();
  if (entry.context.state !== "closed") entry.context.close().catch(() => {});
}
