import { AGENT_AUDIO_MAX_SECONDS, AGENT_AUDIO_SAMPLE_RATE } from '@arweqah-platform/shared';

/** Why a recording or file cannot be sent: longer than the limit, or a sound this browser cannot read. */
export class AudioProblem extends Error {
  constructor(readonly code: 'tooLong' | 'unreadable') {
    super(code);
  }
}

/** 16-bit PCM WAV of one channel (the only sound the server accepts): the 44-byte header, then the samples clipped to -1…1. */
export function encodeWav(samples: Float32Array, rate: number): Blob {
  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(bytes);
  const text = (at: number, value: string) => [...value].forEach((char, i) => view.setUint8(at + i, char.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, i) => view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, sample)) * 32767), true));
  return new Blob([bytes], { type: 'audio/wav' });
}

type AudioContextClass = typeof AudioContext;
const contextClass = (): AudioContextClass | undefined => window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextClass }).webkitAudioContext;

/** What the browser makes of the sound (mp3, m4a, ogg, webm…), or `unreadable`. */
async function decode(source: Blob): Promise<AudioBuffer> {
  const Context = contextClass();
  if (!Context) throw new AudioProblem('unreadable');
  const context = new Context();
  try {
    return await context.decodeAudioData(await source.arrayBuffer());
  } catch {
    throw new AudioProblem('unreadable');
  } finally {
    void context.close();
  }
}

/** Any sound the browser can play, as a 16 kHz mono WAV (a five-minute recording is about 9.6 MB): the server never converts, so this is where every format ends. */
export async function toWav(source: Blob): Promise<Blob> {
  const buffer = await decode(source);
  if (buffer.duration > AGENT_AUDIO_MAX_SECONDS) throw new AudioProblem('tooLong');
  const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(buffer.duration * AGENT_AUDIO_SAMPLE_RATE)), AGENT_AUDIO_SAMPLE_RATE);
  const node = offline.createBufferSource();
  node.buffer = buffer;
  node.connect(offline.destination);
  node.start();
  return encodeWav((await offline.startRendering()).getChannelData(0), AGENT_AUDIO_SAMPLE_RATE);
}
