import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** RFC 6238 time-based one-time passwords (SHA-1, 6 digits, 30 s), the format every authenticator app uses. */
export const TOTP_PERIOD_SECONDS = 30;
export const TOTP_DIGITS = 6;
/** Steps accepted before and after the current one (clock drift), 30 s each. */
export const TOTP_WINDOW = 1;
export const BACKUP_CODE_COUNT = 10;

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(data: Buffer): string {
  let bits = '';
  for (const byte of data) bits += byte.toString(2).padStart(8, '0');
  return (bits.match(/.{1,5}/g) ?? []).map((chunk) => BASE32[parseInt(chunk.padEnd(5, '0'), 2)]).join('');
}

export function base32Decode(input: string): Buffer {
  let bits = '';
  for (const char of input.replace(/=+$/, '').toUpperCase()) bits += BASE32.indexOf(char).toString(2).padStart(5, '0');
  return Buffer.from((bits.match(/.{8}/g) ?? []).map((b) => parseInt(b, 2)));
}

/** 160-bit secret, base32 (what the authenticator app stores). */
export const generateSecret = (): string => base32Encode(randomBytes(20));

export const currentStep = (now: number = Date.now()): number => Math.floor(now / 1000 / TOTP_PERIOD_SECONDS);

function codeAt(secret: Buffer, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac('sha1', secret).update(counter).digest();
  const offset = (hmac[hmac.length - 1] ?? 0) & 0x0f;
  const value = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** TOTP_DIGITS;
  return value.toString().padStart(TOTP_DIGITS, '0');
}

/** The step whose code matches, or null. Every candidate is compared in constant time. */
export function matchingStep(secretBase32: string, code: string, now: number = Date.now()): number | null {
  const secret = base32Decode(secretBase32);
  const given = Buffer.from(code.replace(/\s+/g, '').padEnd(TOTP_DIGITS, ' ').slice(0, TOTP_DIGITS));
  let match: number | null = null;
  for (let offset = -TOTP_WINDOW; offset <= TOTP_WINDOW; offset += 1) {
    const step = currentStep(now) + offset;
    if (timingSafeEqual(Buffer.from(codeAt(secret, step)), given)) match = step;
  }
  return match;
}

export function otpauthUri(input: { secret: string; account: string; issuer: string }): string {
  const label = `${encodeURIComponent(input.issuer)}:${encodeURIComponent(input.account)}`;
  const params = new URLSearchParams({ secret: input.secret, issuer: input.issuer, algorithm: 'SHA1', digits: String(TOTP_DIGITS), period: String(TOTP_PERIOD_SECONDS) });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** Single-use recovery codes shown once, e.g. "K7MQ2-X9PD4". Only their hashes are stored. */
export function generateBackupCodes(count: number = BACKUP_CODE_COUNT): string[] {
  return Array.from({ length: count }, () => {
    const raw = base32Encode(randomBytes(7)).slice(0, 10);
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

export const looksLikeBackupCode = (input: string): boolean => /^[A-Za-z2-7]{5}-?[A-Za-z2-7]{5}$/.test(input.trim());

export const hashBackupCode = (code: string): string =>
  createHash('sha256').update(code.replace(/[-\s]/g, '').toUpperCase()).digest('hex');

export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');
