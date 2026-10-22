import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.schema';

const base = {
  APP_URL: 'https://app.example.com',
  API_URL: 'https://app.example.com',
  CORS_ORIGINS: 'https://app.example.com',
  DB_HOST: 'db',
  DB_NAME: 'app',
  DB_USER: 'app',
  DB_PASSWORD: 'x',
  BETTER_AUTH_SECRET: 'a'.repeat(40),
  FIELD_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
  BLIND_INDEX_KEY: randomBytes(32).toString('base64'),
};
const microsoft = { MICROSOFT_CLIENT_ID: 'id', MICROSOFT_CLIENT_SECRET: 'secret' };

describe('environment validation (FR-03)', () => {
  it.each(['common', 'organizations', 'consumers', undefined])('refuses Microsoft sign-in with tenant %s', (tenant) => {
    expect(() => validateEnv({ ...base, ...microsoft, MICROSOFT_TENANT_ID: tenant })).toThrow(/company tenant GUID/);
  });

  it('accepts the company tenant GUID', () => {
    const env = validateEnv({ ...base, ...microsoft, MICROSOFT_TENANT_ID: '0f1e3a00-c9a8-4c00-8a00-000000000001' });
    expect(env.MICROSOFT_TENANT_ID).toBeDefined();
  });

  it('rejects short auth secrets and wrong-size encryption keys', () => {
    expect(() => validateEnv({ ...base, BETTER_AUTH_SECRET: 'short' })).toThrow(/BETTER_AUTH_SECRET/);
    expect(() => validateEnv({ ...base, FIELD_ENCRYPTION_KEY: randomBytes(16).toString('base64') })).toThrow(/FIELD_ENCRYPTION_KEY/);
  });

  it('keeps the sign-in limit at 5 per minute by default and refuses a loose limit in production', () => {
    expect(validateEnv({ ...base }).SIGN_IN_RATE_LIMIT).toBe(5);
    expect(validateEnv({ ...base, NODE_ENV: 'development', SIGN_IN_RATE_LIMIT: '1000' }).SIGN_IN_RATE_LIMIT).toBe(1000);
    expect(() => validateEnv({ ...base, NODE_ENV: 'production', SIGN_IN_RATE_LIMIT: '1000' })).toThrow(/SIGN_IN_RATE_LIMIT/);
  });

  it('Microsoft needs a client secret or a certificate (thumbprint + private key), never both', () => {
    const tenant = { MICROSOFT_CLIENT_ID: 'id', MICROSOFT_TENANT_ID: '0f1e3a00-c9a8-4c00-8a00-000000000001' };
    const thumbprint = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
    expect(() => validateEnv({ ...base, ...tenant })).toThrow(/MICROSOFT_CLIENT_SECRET/);
    expect(() => validateEnv({ ...base, ...tenant, MICROSOFT_CERT_THUMBPRINT: thumbprint })).toThrow(/MICROSOFT_CLIENT_SECRET/);
    expect(validateEnv({ ...base, ...tenant, MICROSOFT_CLIENT_SECRET: 'secret' }).MICROSOFT_CLIENT_ID).toBe('id');
    expect(validateEnv({ ...base, ...tenant, MICROSOFT_CERT_THUMBPRINT: thumbprint, MICROSOFT_CERT_PRIVATE_KEY_FILE: '/keys/ms.key' }).MICROSOFT_CERT_THUMBPRINT).toBe(thumbprint);
    expect(() => validateEnv({ ...base, ...tenant, MICROSOFT_CLIENT_SECRET: 'secret', MICROSOFT_CERT_THUMBPRINT: thumbprint, MICROSOFT_CERT_PRIVATE_KEY: 'k' })).toThrow(/not both/);
    expect(() => validateEnv({ ...base, ...tenant, MICROSOFT_CERT_THUMBPRINT: 'abc', MICROSOFT_CERT_PRIVATE_KEY: 'k' })).toThrow(/thumbprint/i);
  });
});
