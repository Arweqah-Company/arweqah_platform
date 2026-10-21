import { describe, expect, it } from 'vitest';
import { BlindIndex } from './blind-index';

describe('BlindIndex', () => {
  const index = new BlindIndex('a-test-key-that-is-at-least-32-characters');

  it('is stable and ignores case and spaces', () => {
    expect(index.of('1234567890')).toBe(index.of(' 1234567890 '));
    expect(index.of('sa 03 8000')).toBe(index.of('SA038000'));
  });

  it('differs per value and per key and never contains the value', () => {
    expect(index.of('1234567890')).not.toBe(index.of('1234567891'));
    expect(new BlindIndex('another-key-that-is-at-least-32-characters').of('1234567890')).not.toBe(index.of('1234567890'));
    expect(index.of('1234567890')).toMatch(/^[0-9a-f]{64}$/);
  });
});
