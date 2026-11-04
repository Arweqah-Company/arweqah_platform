import { CorePermission, type DirectoryEntryDto, type DirectoryProfileDto, type Paginated, type PermissionGrant } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { useTestApp } from './setup/test-app';

const P = CorePermission;
const grant = (key: string, scope: PermissionGrant['scope']): PermissionGrant => ({ key, scope });
const ENTRY_KEYS = ['company', 'fullName', 'fullNameEn', 'id', 'jobTitle', 'orgNode', 'photoFileId', 'workEmail', 'workPhone'];

describe('My team: the colleagues of my own unit (FR-92)', () => {
  const t = useTestApp();

  async function setup() {
    const org = await t.factories.org();
    const viewer = await t.factories.user({ unit: org.unitA });
    const colleague = await t.factories.user({ unit: org.unitA });
    const sibling = await t.factories.user({ unit: org.unitB });
    const other = await t.factories.user({ unit: org.unitOther });
    return { org, viewer, colleague, sibling, other, agent: await t.factories.signIn(viewer) };
  }
  const list = async (agent: Awaited<ReturnType<typeof setup>>['agent'], query = '') => (await agent.get(`/api/directory${query}`).expect(200)).body as Paginated<DirectoryEntryDto>;

  it('lists the colleagues of my unit with their basic details only, never the sensitive or personal fields', async () => {
    const { agent, colleague } = await setup();
    const page = await list(agent, '?pageSize=100');
    const found = page.items.find((i) => i.id === colleague.employeeId);
    expect(found).toBeTruthy();
    expect(Object.keys(found ?? {}).sort()).toEqual(ENTRY_KEYS);
    expect(JSON.stringify(page)).not.toMatch(/personalPhone|personalEmail|idNumber|iban|salary|birthDate/i);
  });

  it('shows only the very same unit: not me, not a sibling unit, not the other company, not a person who cannot sign in', async () => {
    const { agent, org, viewer, colleague, sibling, other } = await setup();
    const gone = await t.factories.user({ unit: org.unitA, active: false });
    const ids = (await list(agent, '?pageSize=100')).items.map((i) => i.id);
    expect(ids).toEqual([colleague.employeeId]);
    for (const left of [viewer.employeeId, sibling.employeeId, other.employeeId, gone.employeeId]) expect(ids).not.toContain(left);
  });

  it('narrows by search, company and job title, and has no unit filter (the unit is always mine)', async () => {
    const { agent, org, colleague } = await setup();
    const byText = await list(agent, `?search=${encodeURIComponent(colleague.email)}`);
    expect(byText.items.map((i) => i.id)).toEqual([colleague.employeeId]);
    expect((await list(agent, `?jobTitleId=${org.unitA.titleId}&pageSize=100`)).items.map((i) => i.id)).toEqual([colleague.employeeId]);
    expect((await list(agent, `?jobTitleId=${org.unitB.titleId}&pageSize=100`)).total).toBe(0);
    expect((await list(agent, `?companyId=${org.companyId}&pageSize=100`)).total).toBe(1);
    expect((await list(agent, `?companyId=${org.otherCompanyId}&pageSize=100`)).total).toBe(0);
    await agent.get(`/api/directory?orgNodeId=${org.unitB.id}`).expect(400);
  });

  it('is empty for a person with no unit, and a system account is never in a team', async () => {
    const { agent } = await setup();
    const unplaced = await t.factories.signIn(await t.factories.user({}));
    expect((await list(unplaced)).total).toBe(0);
    expect((await list(agent, '?pageSize=100')).items.some((i) => i.fullName.includes('System'))).toBe(false);
  });

  it('gives the basics to a teammate, more to the managers, and the whole record to who may open it; a person of another unit is a 404', async () => {
    const { agent, viewer, colleague, sibling, org } = await setup();
    const basic = (await agent.get(`/api/directory/${colleague.employeeId}`).expect(200)).body as DirectoryProfileDto;
    expect(basic.level).toBe('basic');
    expect(basic.details).toBeNull();
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [viewer.employeeId, colleague.employeeId]);
    const managed = (await agent.get(`/api/directory/${colleague.employeeId}`).expect(200)).body as DirectoryProfileDto;
    expect(managed.level).toBe('extended');
    expect(managed.details?.startDate).toBeTruthy();
    expect(managed.manager?.id).toBe(viewer.employeeId);
    const hr = await t.factories.signIn(await t.factories.user({ unit: org.unitA, grants: [grant(P.EmployeesView, 'all')] }));
    expect(((await hr.get(`/api/directory/${colleague.employeeId}`).expect(200)).body as DirectoryProfileDto).level).toBe('full');
    await agent.get(`/api/directory/${sibling.employeeId}`).expect(404);
  });

  it('keeps the profile of a person with no key (403) and refuses a malformed query (400) or an unknown record (404)', async () => {
    const { agent, colleague } = await setup();
    const blind = await t.factories.signIn(await t.factories.user({ without: ['directory.'] }));
    await blind.get('/api/directory').expect(403);
    await blind.get(`/api/directory/${colleague.employeeId}`).expect(403);
    await agent.get('/api/directory?companyId=nope').expect(400);
    await agent.get('/api/directory/00000000-0000-4000-8000-0000000000ff').expect(404);
  });
});
