import { describe, expect, it } from 'vitest';
import { totpFromUri } from '../../../../test/helpers/totp';
import { base32Decode, base32Encode, generateBackupCodes, generateSecret, hashBackupCode, looksLikeBackupCode, matchingStep, otpauthUri, currentStep } from './totp';

describe('TOTP (RFC 6238)', () => {
  it('matches the RFC 6238 SHA-1 test vector (secret "12345678901234567890", T=59 s → 94287082, last 6 digits 287082)', () => {
    const secret = base32Encode(Buffer.from('12345678901234567890'));
    expect(matchingStep(secret, '287082', 59_000)).toBe(1);
  });

  it('round-trips base32 and generates distinct 160-bit secrets', () => {
    const buffer = Buffer.from('hello world');
    expect(base32Decode(base32Encode(buffer)).toString()).toBe('hello world');
    expect(generateSecret()).toMatch(/^[A-Z2-7]{32}$/);
    expect(generateSecret()).not.toBe(generateSecret());
  });

  it('accepts the current code and one step of drift but not older or newer', () => {
    const secret = generateSecret();
    const uri = otpauthUri({ secret, account: 'a@arweqah.sa', issuer: 'Arweqah' });
    const now = Date.now();
    expect(matchingStep(secret, totpFromUri(uri, now), now)).toBe(currentStep(now));
    expect(matchingStep(secret, totpFromUri(uri, now - 30_000), now)).toBe(currentStep(now) - 1);
    expect(matchingStep(secret, totpFromUri(uri, now - 90_000), now)).toBeNull();
    expect(matchingStep(secret, '000000', now)).toBeNull();
    expect(matchingStep(secret, 'abc', now)).toBeNull();
  });

  it('builds a URI authenticator apps understand', () => {
    const uri = otpauthUri({ secret: 'ABCDEFGH', account: 'sara@arweqah.sa', issuer: 'Arweqah Platform' });
    expect(uri.startsWith('otpauth://totp/Arweqah%20Platform:sara%40arweqah.sa?')).toBe(true);
    expect(new URL(uri).searchParams.get('secret')).toBe('ABCDEFGH');
  });

  it('creates unique backup codes that hash the same with or without the dash', () => {
    const codes = generateBackupCodes();
    expect(new Set(codes).size).toBe(10);
    expect(codes.every(looksLikeBackupCode)).toBe(true);
    const code = codes[0] as string;
    expect(hashBackupCode(code)).toBe(hashBackupCode(code.replace('-', '').toLowerCase()));
    expect(looksLikeBackupCode('123456')).toBe(false);
  });
});
