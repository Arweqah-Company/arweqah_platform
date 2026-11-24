import { describe, expect, it } from 'vitest';
import { wav } from '../../../../../test/helpers/wav';
import { wavFacts } from './agent-audio.rules';

describe('The speech of the assistant chat is a 16-bit PCM WAV (FR-181)', () => {
  it('FR-181: reads the length and the rate from the headers', () => {
    expect(wavFacts(wav(2))).toEqual({ seconds: 2, sampleRate: 16_000 });
    expect(wavFacts(wav(1, { rate: 44_100, channels: 2 }))).toEqual({ seconds: 1, sampleRate: 44_100 });
  });

  it('FR-181: anything else is refused: another kind of file, 8 or 24 bit, compressed, cut short, empty', () => {
    expect(wavFacts(Buffer.from('ID3 not a wave file at all, an mp3 maybe......'.padEnd(60, 'x')))).toBeNull();
    expect(wavFacts(wav(1, { bits: 8 }))).toBeNull();
    expect(wavFacts(wav(1, { bits: 24 }))).toBeNull();
    expect(wavFacts(wav(1, { format: 3 }))).toBeNull();
    expect(wavFacts(wav(1).subarray(0, 30))).toBeNull();
    expect(wavFacts(Buffer.alloc(0))).toBeNull();
  });

  it('FR-181: a data size that claims more than the file holds counts only what is there', () => {
    const cut = wav(4).subarray(0, 44 + 16_000 * 2);
    expect(wavFacts(cut)?.seconds).toBe(1);
  });
});
