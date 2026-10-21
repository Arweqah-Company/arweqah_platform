import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { FieldCipher } from './field-cipher';

describe('FieldCipher', () => {
  const cipher = new FieldCipher(randomBytes(32).toString('base64'));

  it('round-trips Arabic text and never produces the same ciphertext twice', () => {
    const a = cipher.encrypt('١٠٢٣٤٥٦٧٨٩');
    expect(a).not.toBe(cipher.encrypt('١٠٢٣٤٥٦٧٨٩'));
    expect(cipher.decrypt(a)).toBe('١٠٢٣٤٥٦٧٨٩');
  });

  it('detects tampering', () => {
    const raw = Buffer.from(cipher.encrypt('1023456789'), 'base64');
    raw[raw.length - 1] = (raw[raw.length - 1] ?? 0) ^ 1;
    expect(() => cipher.decrypt(raw.toString('base64'))).toThrow();
  });

  it('refuses keys that are not 32 bytes', () => {
    expect(() => new FieldCipher(randomBytes(16).toString('base64'))).toThrow();
  });
});
