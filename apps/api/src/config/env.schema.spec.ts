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
});
