/** A WAV of silence: `seconds` long, 16-bit, at `rate`, with `channels` channels. */
export function wav(seconds: number, { rate = 16_000, channels = 1, bits = 16, format = 1 } = {}): Buffer {
  const data = Buffer.alloc(Math.round(seconds * rate * channels * (bits / 8)));
  const head = Buffer.alloc(44);
  head.write('RIFF', 0, 'ascii');
  head.writeUInt32LE(36 + data.length, 4);
  head.write('WAVEfmt ', 8, 'ascii');
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(format, 20);
  head.writeUInt16LE(channels, 22);
  head.writeUInt32LE(rate, 24);
  head.writeUInt32LE(rate * channels * (bits / 8), 28);
  head.writeUInt16LE(channels * (bits / 8), 32);
  head.writeUInt16LE(bits, 34);
  head.write('data', 36, 'ascii');
  head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}
