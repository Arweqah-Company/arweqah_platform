import { createHash, createPrivateKey, randomUUID, sign, X509Certificate } from 'node:crypto';

/**
 * Microsoft sign-in without a client secret: the app proves who it is with a certificate (private_key_jwt, RFC 7523).
 * Some tenants block client secrets by policy; certificates are the supported alternative.
 * Plain syntax only (no enums, no parameter properties) so scripts can import this file directly with Node.
 */
const LIFETIME_SECONDS = 600;

const base64url = (input: Buffer | string): string => Buffer.from(input).toString('base64url');

/** SHA-1 thumbprint (hex, as Azure shows it) of a certificate in PEM form. */
export function thumbprintOf(certificatePem: string): string {
  return createHash('sha1').update(new X509Certificate(certificatePem).raw).digest('hex');
}

/** Signs the one-time JWT the token endpoint accepts instead of a client secret. */
export function signMicrosoftClientAssertion(input: { clientId: string; tokenEndpoint: string; privateKeyPem: string; thumbprint: string; now?: Date }): string {
  const issuedAt = Math.floor((input.now ?? new Date()).getTime() / 1000);
  const header = { alg: 'RS256', typ: 'JWT', x5t: base64url(Buffer.from(input.thumbprint, 'hex')) };
  const payload = { aud: input.tokenEndpoint, iss: input.clientId, sub: input.clientId, jti: randomUUID(), nbf: issuedAt, iat: issuedAt, exp: issuedAt + LIFETIME_SECONDS };
  const body = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  return `${body}.${sign('RSA-SHA256', Buffer.from(body), createPrivateKey(input.privateKeyPem)).toString('base64url')}`;
}

/** The getter Better Auth calls for every token request (a fresh assertion each time). */
export function createMicrosoftCertificateAssertion(options: { privateKeyPem: string; thumbprint: string }) {
  return ({ clientId, tokenEndpoint }: { clientId: string; tokenEndpoint: string }): string => signMicrosoftClientAssertion({ clientId, tokenEndpoint, ...options });
}
