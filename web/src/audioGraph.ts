interface SharedAudio {
  context: AudioContext;
  source: MediaStreamAudioSourceNode;
}

const registry = new Map<MediaStream, SharedAudio>();

export function getSharedAudioSource(stream: MediaStream): SharedAudio {
  let entry = registry.get(stream);
  if (!entry) {
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
