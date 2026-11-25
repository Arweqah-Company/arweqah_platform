export interface WavFacts {
  seconds: number;
  sampleRate: number;
}

interface WavFormat {
  channels: number;
  sampleRate: number;
  bits: number;
  pcm: boolean;
}

/** The `fmt ` chunk that starts at `at`, or null when the file ends before it does. */
function readFormat(bytes: Buffer, at: number): WavFormat | null {
  if (at + 24 > bytes.length) return null;
  return { pcm: bytes.readUInt16LE(at + 8) === 1, channels: bytes.readUInt16LE(at + 10), sampleRate: bytes.readUInt32LE(at + 12), bits: bytes.readUInt16LE(at + 22) };
}

const isPcm16 = (format: WavFormat | null): format is WavFormat => format !== null && format.pcm && format.bits === 16 && format.channels > 0 && format.sampleRate > 0;

/**
 * What a 16-bit PCM WAV says about itself, read from its headers (the `fmt ` and `data` chunks), or null when it is anything else (another format, 8 or 24 bit,
 * a cut file). The screen makes the sound a WAV before it is sent, so this is the whole check: nothing else is ever decoded on the server.
 */
export function wavFacts(bytes: Buffer): WavFacts | null {
  if (bytes.length < 44 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') return null;
  let format: WavFormat | null = null;
  for (let at = 12; at + 8 <= bytes.length; ) {
    const id = bytes.toString('ascii', at, at + 4);
    const size = bytes.readUInt32LE(at + 4);
    if (id === 'fmt ') format = readFormat(bytes, at);
    if (id === 'data') return isPcm16(format) ? { sampleRate: format.sampleRate, seconds: Math.min(size, bytes.length - at - 8) / (format.sampleRate * format.channels * 2) } : null;
    at += 8 + size + (size % 2);
  }
  return null;
}
