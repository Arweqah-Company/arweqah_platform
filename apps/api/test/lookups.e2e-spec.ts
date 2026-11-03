import { CorePermission, type LookupsDto, ORG_ADMIN_PERMISSIONS } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { ADMIN_MODE_GRANT } from './factories/factories';
import { useTestApp } from './setup/test-app';

const viewer = [{ key: CorePermission.LookupsView, scope: 'all' as const }];

describe('Lookups and translations (FR-22)', () => {
  const t = useTestApp();

  it('returns every option list with Arabic by default and English on request, always with both names', async () => {
    const agent = await t.factories.signIn(await t.factories.user({ grants: viewer }));
    const ar: LookupsDto = (await agent.get('/api/lookups').expect(200)).body;
    const en: LookupsDto = (await agent.get('/api/lookups').set('Accept-Language', 'en-US,en;q=0.9').expect(200)).body;
    const married = (list: LookupsDto) => list.maritalStatuses.find((m) => m.code === 'married');
    expect(married(ar)).toMatchObject({ name: 'متزوج', nameAr: 'متزوج', nameEn: 'Married' });
    expect(married(en)).toMatchObject({ name: 'Married', nameAr: 'متزوج', nameEn: 'Married' });
    expect(ar.relationTypes.map((r) => r.nameEn)).toEqual(['Employee', 'Collaborator']);
    expect(ar.idTypes.map((i) => i.code)).toEqual(['national_id', 'iqama', 'home_country_id', 'passport', 'border_number', 'gcc_id']);
  });

  it('carries the flags and rules the form is built from, never from fixed lists in the client', async () => {
    const agent = await t.factories.signIn(await t.factories.user({ grants: viewer }));
    const lookups: LookupsDto = (await agent.get('/api/lookups').expect(200)).body;
    const contract = (code: string) => lookups.contractTypes.find((c) => c.code === code);
    expect(contract('fixed_term')).toMatchObject({ requiresEndDate: true, isOther: false });
    expect(contract('indefinite_term')).toMatchObject({ requiresEndDate: false });
    expect(contract('other')).toMatchObject({ isOther: true });
    expect(lookups.terminationReasons.find((r) => r.code === 'other')?.isOther).toBe(true);
    const national = lookups.idTypes.find((i) => i.code === 'national_id');
    expect(national?.rules[0]).toMatchObject({ regex: '^1\\d{9}$', minLength: 10, maxLength: 10, countryId: null });
    expect(national?.rules[0]?.errorMessageAr).toContain('الهوية الوطنية');
    expect(national?.rules[0]?.errorMessageEn).toContain('National ID');
    expect(lookups.idTypes.filter((i) => i.requiresCountry).map((i) => i.code).sort()).toEqual(['gcc_id', 'home_country_id']);
    const saudi = lookups.countries.find((c) => c.code === 'SA');
    expect(saudi).toMatchObject({ currencyCode: 'SAR', nameAr: 'المملكة العربية السعودية', nameEn: 'Saudi Arabia', isoCode: 'SA' });
    expect(lookups.countries.length).toBeGreaterThan(200);
    expect(lookups.countries[0]?.code).toBe('SA');
  });

  it('lists companies and the units that can take employees, with the default manager inherited from above', async () => {
    const org = await t.factories.org();
    const admin = await t.factories.user({ unit: org.unitA, grants: [ADMIN_MODE_GRANT, ...viewer, ...ORG_ADMIN_PERMISSIONS.map((key) => ({ key, scope: 'all' as const }))] });
    const agent = await t.factories.signInAdminMode(admin);
    const companies = (await agent.get('/api/lookups/companies').set('Accept-Language', 'en').expect(200)).body;
    expect(companies.map((c: { id: string }) => c.id)).toEqual(expect.arrayContaining([org.companyId, org.otherCompanyId]));
    const before = (await agent.get('/api/lookups/org-nodes').query({ companyId: org.companyId }).expect(200)).body;
    expect(before.map((n: { id: string }) => n.id).sort()).toEqual([org.unitA.id, org.unitB.id, org.unitC.id].sort());
    expect(before.every((n: { defaultManagerId: string | null }) => n.defaultManagerId === null)).toBe(true);
    await agent.put(`/api/org/nodes/${org.sectionAB}`).send({ startDate: '2024-01-01', nameAr: 'قسم أ ب', nameEn: 'Section AB', managerId: admin.employeeId, isActive: true }).expect(200);
    const after = (await agent.get('/api/lookups/org-nodes').query({ companyId: org.companyId }).expect(200)).body as { id: string; defaultManagerId: string | null; pathEn: string }[];
    expect(after.find((n) => n.id === org.unitA.id)?.defaultManagerId).toBe(admin.employeeId);
    expect(after.find((n) => n.id === org.unitC.id)?.defaultManagerId).toBeNull();
    expect(after.find((n) => n.id === org.unitA.id)?.pathEn).toBe('Sector › Department › Section AB › Unit A');
    const titles = (await agent.get('/api/lookups/job-titles').query({ orgNodeId: org.unitA.id }).expect(200)).body;
    expect(titles).toHaveLength(1);
    expect(titles[0].id).toBe(org.unitA.titleId);
  });

  it('offers every company\'s assignable units with their job titles in one call, for import templates', async () => {
    const org = await t.factories.org();
    const agent = await t.factories.signIn(await t.factories.user({ grants: viewer }));
    const reference = (await agent.get('/api/lookups/org-reference').expect(200)).body as { companyId: string; units: { id: string; pathEn: string; titles: { nameEn: string }[] }[] }[];
    const mine = reference.find((c) => c.companyId === org.companyId);
    expect(mine?.units.map((u) => u.id)).toContain(org.unitA.id);
    const unit = mine?.units.find((u) => u.id === org.unitA.id);
    expect(unit?.pathEn).toContain('Unit A');
    expect(unit?.titles.length).toBeGreaterThan(0);
  });

  it('answers 403 without lookups.view and 400 for a malformed query', async () => {
    const plain = await t.factories.signIn(await t.factories.user());
    for (const path of ['/api/lookups', '/api/lookups/companies', '/api/lookups/org-nodes', '/api/lookups/job-titles', '/api/lookups/org-reference']) await plain.get(path).expect(403);
    const agent = await t.factories.signIn(await t.factories.user({ grants: viewer }));
    await agent.get('/api/lookups/org-nodes').query({ companyId: 'not-a-uuid' }).expect(400);
    await agent.get('/api/lookups/job-titles').expect(400);
  });
});
