import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { discoverRoutes } from './helpers/routes';
import { useTestApp } from './setup/test-app';

describe('Security suite (NFR-02, NFR-03)', () => {
  const t = useTestApp();

  it('every non-public route answers 401 without a session', async () => {
    const routes = discoverRoutes(t.app).filter((r) => !r.isPublic);
    expect(routes.length).toBeGreaterThan(20);
    for (const route of routes) {
      const res = await request(t.app.getHttpServer())[route.method](route.path).send({});
      expect(res.status, `${route.method.toUpperCase()} ${route.path}`).toBe(401);
    }
  });

  it('every permission-protected route answers 403 to a signed-in user without that permission', async () => {
    const agent = await t.factories.signIn(await t.factories.user());
    const routes = discoverRoutes(t.app).filter((r) => r.permission);
    for (const route of routes) {
      const res = await agent[route.method](route.path).send({});
      expect(res.status, `${route.method.toUpperCase()} ${route.path} (${route.permission})`).toBe(403);
    }
  });

  it('rejects forged, tampered and unknown session cookies', async () => {
    for (const cookie of ['better-auth.session_token=forged.value', 'better-auth.session_token=', 'other=1']) {
      await request(t.app.getHttpServer()).get('/api/me').set('Cookie', cookie).expect(401);
    }
  });

  it('sends hardened headers and hides the framework', async () => {
    const res = await request(t.app.getHttpServer()).get('/api/health').expect(200);
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('allows only configured CORS origins', async () => {
    const server = t.app.getHttpServer();
    const evil = await request(server).get('/api/health').set('Origin', 'https://evil.example');
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
    const good = await request(server).get('/api/health').set('Origin', 'http://localhost:4173');
    expect(good.headers['access-control-allow-origin']).toBe('http://localhost:4173');
  });

  it('rejects unknown fields (400) and oversized bodies (413) without leaking internals', async () => {
    const agent = await t.factories.signIn(await t.factories.user());
    const unknown = await agent.post('/api/notifications/read').send({ ids: [], extra: true });
    expect(unknown.status).toBe(400);
    const huge = await agent.post('/api/notifications/read').send({ ids: ['x'.repeat(2 * 1024 * 1024)] });
    expect(huge.status).toBe(413);
    for (const res of [unknown, huge]) expect(JSON.stringify(res.body)).not.toMatch(/at \w+ \(|node_modules|SELECT/);
  });

  it('clamps page size to the maximum', async () => {
    const agent = await t.factories.signIn(await t.factories.user());
    await agent.get('/api/notifications').query({ pageSize: 10_000 }).expect(400);
  });
});
