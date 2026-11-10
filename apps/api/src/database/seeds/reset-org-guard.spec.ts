import { describe, expect, it } from 'vitest';
import { assertResetAllowed } from './reset-org-guard';

describe('the organization reset guard (development only)', () => {
  it('allows an explicit development or test environment on a local database', () => {
    expect(() => assertResetAllowed({ NODE_ENV: 'development', DB_HOST: '127.0.0.1' })).not.toThrow();
    expect(() => assertResetAllowed({ NODE_ENV: 'test', DB_HOST: 'localhost' })).not.toThrow();
  });

  it('refuses production, an unset environment and anything unknown', () => {
    for (const NODE_ENV of ['production', undefined, '', 'staging']) {
      expect(() => assertResetAllowed({ NODE_ENV, DB_HOST: '127.0.0.1' })).toThrow('development only');
    }
  });

  it('refuses a database that is not on this machine, even in development', () => {
    expect(() => assertResetAllowed({ NODE_ENV: 'development', DB_HOST: 'db.internal.example' })).toThrow('local');
    expect(() => assertResetAllowed({ NODE_ENV: 'development' })).toThrow('local');
  });

  it('allows a server only when the confirmation is the exact name of the database', () => {
    const server = { NODE_ENV: 'production', DB_HOST: 'postgres', DB_NAME: 'arweqah_platform' };
    expect(() => assertResetAllowed({ ...server, ORG_RESET_CONFIRM: 'arweqah_platform' })).not.toThrow();
    expect(() => assertResetAllowed({ ...server, ORG_RESET_CONFIRM: 'other' })).toThrow('development only');
    expect(() => assertResetAllowed({ ...server, ORG_RESET_CONFIRM: '' })).toThrow('development only');
    expect(() => assertResetAllowed({ ...server, DB_NAME: undefined, ORG_RESET_CONFIRM: 'x' })).toThrow('development only');
  });
});
