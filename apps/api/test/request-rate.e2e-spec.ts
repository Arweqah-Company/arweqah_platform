import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { SecuritySettingsService } from '../src/core/auth/application/security-settings.service';
import { useTestApp } from './setup/test-app';

describe('Requests per minute from one address (FR-76)', () => {
  const t = useTestApp();
  const limitTo = async (requestsPerMinute: number) => {
    await t.db.query(`INSERT INTO security_settings (key, value) VALUES ('requestsPerMinute', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [requestsPerMinute]);
    t.app.get(SecuritySettingsService).invalidate();
  };
  const get = (address: string) => request(t.app.getHttpServer()).get('/api/me').set('x-forwarded-for', address);

  it('answers 429 with Retry-After once an address used its requests, and leaves other addresses alone', async () => {
    await limitTo(30);
    const statuses: number[] = [];
    for (let i = 0; i < 32; i += 1) statuses.push((await get('10.9.0.1')).status);
    expect(statuses.slice(0, 30).every((s) => s === 401)).toBe(true);
    expect(statuses.slice(30)).toEqual([429, 429]);
    const blocked = await get('10.9.0.1');
    expect(blocked.headers['retry-after']).toBe('60');
    expect(blocked.body).toMatchObject({ statusCode: 429, code: 'TOO_MANY_REQUESTS' });
    expect((await get('10.9.0.2')).status).toBe(401);
  });

  it('never limits the health check', async () => {
    await limitTo(30);
    for (let i = 0; i < 40; i += 1) await request(t.app.getHttpServer()).get('/api/health').set('x-forwarded-for', '10.9.0.3');
    expect((await request(t.app.getHttpServer()).get('/api/health').set('x-forwarded-for', '10.9.0.3')).status).not.toBe(429);
  });

  it('follows the number the administrator sets: a higher limit lets the same address through', async () => {
    await limitTo(30);
    for (let i = 0; i < 31; i += 1) await get('10.9.0.4');
    expect((await get('10.9.0.4')).status).toBe(429);
    await limitTo(100);
    expect((await get('10.9.0.4')).status).toBe(401);
  });
});
