import { CorePermission } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { AuditService } from '../src/core/audit/application/audit.service';
import { GeoipRefreshJob } from '../src/core/integrations/application/services/geoip-refresh.job';
import { ADMIN_MODE_GRANT } from './factories/factories';
import { useTestApp } from './setup/test-app';

const KEYS = { accountId: '123456', licenseKey: 'good' };
const GEO = [CorePermission.IntegrationsGeoipView, CorePermission.IntegrationsGeoipEdit, CorePermission.IntegrationsGeoipTest, CorePermission.IntegrationsGeoipActivate, CorePermission.AuditView];

describe('The city of each address in the audit log (FR-132)', () => {
  const t = useTestApp();
  const admin = async () => t.factories.signInAdminMode(await t.factories.user({ grants: [ADMIN_MODE_GRANT, ...GEO.map((key) => ({ key, scope: 'all' as const }))] }));
  const write = (ip: string) => t.app.get(AuditService).record({ actorId: null, action: 'role.created', entityType: 'role', entityId: 'geo-test', changes: { ip }, ip });
  const cityOf = async (agent: Awaited<ReturnType<typeof admin>>, ip: string) => {
    const items = (await agent.get('/api/audit-logs?entityId=geo-test').expect(200)).body.items as { ip: string; ipCity: { en: string } | null }[];
    return items.find((e) => e.ip === ip)?.ipCity?.en ?? null;
  };

  it('shows no city while the service is off, the city once it is tried and switched on, and keeps the license key secret', async () => {
    const agent = await admin();
    await write('203.0.113.9');
    expect(await cityOf(agent, '203.0.113.9')).toBeNull();
    const bad = (await agent.post('/api/integrations/geoip/maxmind/test').send({ values: { ...KEYS, licenseKey: 'wrong' } }).expect(200)).body;
    expect(bad).toMatchObject({ ok: false });
    expect(bad.message).not.toContain('wrong');
    await agent.put('/api/integrations/geoip/maxmind').send({ values: KEYS }).expect(200);
    await agent.post('/api/integrations/geoip/maxmind/activate').expect(422).expect((r) => expect(r.body.code).toBe('PROVIDER_NOT_TESTED'));
    const tried = (await agent.post('/api/integrations/geoip/maxmind/test').send({ values: KEYS }).expect(200)).body;
    expect(tried).toMatchObject({ ok: true, text: '62.5 MB' });
    const saved = (await agent.put('/api/integrations/geoip/maxmind').send({ values: KEYS }).expect(200)).body;
    expect(JSON.stringify(saved)).not.toContain('good');
    await agent.post('/api/integrations/geoip/maxmind/activate').expect(200);
    expect(await cityOf(agent, '203.0.113.9')).toBe('Riyadh');
    await write('10.0.0.5');
    expect(await cityOf(agent, '10.0.0.5')).toBeNull(); // a private or unknown address has no city
    await agent.post('/api/integrations/geoip/deactivate').expect(200);
    expect(await cityOf(agent, '203.0.113.9')).toBeNull();
  });

  it('records the address of the request on entries that did not carry one, and refreshes the database weekly only while switched on', async () => {
    const agent = await admin();
    const before = t.geoip.installs.length;
    expect(await t.app.get(GeoipRefreshJob).refresh()).toBe(false); // switched off: nothing is downloaded
    await agent.put('/api/integrations/geoip/maxmind').send({ values: KEYS }).expect(200);
    await agent.post('/api/integrations/geoip/maxmind/test').send({ values: KEYS }).expect(200);
    await agent.post('/api/integrations/geoip/maxmind/activate').expect(200);
    expect(await t.app.get(GeoipRefreshJob).refresh()).toBe(true);
    expect(t.geoip.installs.length).toBe(before + 2);
    const entries = (await agent.get('/api/audit-logs?category=settings').expect(200)).body.items as { action: string; ip: string | null }[];
    expect(entries.some((e) => e.ip)).toBe(true); // the settings changes above carry the address the request came from
  });

  it('keeps the page behind its own keys: a person without them gets 403', async () => {
    const plain = await t.factories.signInAdminMode(await t.factories.user({ grants: [ADMIN_MODE_GRANT] }));
    await plain.get('/api/integrations/geoip').expect(403);
  });
});
