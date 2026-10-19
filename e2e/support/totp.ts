import { createHmac } from 'node:crypto';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** RFC 6238 code for a TOTP URI: the test plays the authenticator app. */
export function totpFromUri(uri: string, now = Date.now()): string {
  const params = new URL(uri).searchParams;
  let bits = '';
  for (const c of (params.get('secret') ?? '').replace(/=+$/, '').toUpperCase()) bits += BASE32.indexOf(c).toString(2).padStart(5, '0');
  const secret = Buffer.from((bits.match(/.{8}/g) ?? []).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 1000 / Number(params.get('period') ?? 30))));
  const hmac = createHmac('sha1', secret).update(counter).digest();
  const offset = (hmac[hmac.length - 1] ?? 0) & 0x0f;
  return ((hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, '0');
}
