import { createVerify, generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createMicrosoftCertificateAssertion, signMicrosoftClientAssertion } from './microsoft-certificate-assertion';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const thumbprint = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
const decode = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as Record<string, unknown>;

describe('Microsoft certificate sign-in (FR-03)', () => {
  it('signs the one-time JWT Microsoft accepts instead of a client secret', () => {
    const now = new Date('2026-10-22T10:00:00Z');
    const jwt = signMicrosoftClientAssertion({ clientId: 'client-1', tokenEndpoint: 'https://login.microsoftonline.com/t/oauth2/v2.0/token', privateKeyPem, thumbprint, now });
    const [header, payload, signature] = jwt.split('.') as [string, string, string];
    expect(decode(header)).toEqual({ alg: 'RS256', typ: 'JWT', x5t: Buffer.from(thumbprint, 'hex').toString('base64url') });
    expect(decode(payload)).toMatchObject({ iss: 'client-1', sub: 'client-1', aud: 'https://login.microsoftonline.com/t/oauth2/v2.0/token', nbf: 1792663200, exp: 1792663800 });
    const verify = createVerify('RSA-SHA256').update(`${header}.${payload}`);
    expect(verify.verify(publicKey, Buffer.from(signature, 'base64url'))).toBe(true);
  });

  it('gives every token request a fresh assertion', () => {
    const assertion = createMicrosoftCertificateAssertion({ privateKeyPem, thumbprint });
    const call = () => assertion({ clientId: 'c', tokenEndpoint: 'https://login.microsoftonline.com/t/oauth2/v2.0/token' });
    expect(decode(call().split('.')[1] as string).jti).not.toBe(decode(call().split('.')[1] as string).jti);
  });
});
