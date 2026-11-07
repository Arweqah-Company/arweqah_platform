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
});
