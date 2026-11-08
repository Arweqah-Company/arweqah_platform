import { CorePermission, type CareerTitleListItemDto, type Paginated } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { complete } from './helpers/career-content';
import { chainScenario } from './helpers/title-chain';
import { useTestApp } from './setup/test-app';

const grants = (...keys: string[]) => keys.map((key) => ({ key, scope: 'all' as const }));
const HR = grants(CorePermission.CareerContentView, CorePermission.CareerContentEdit, CorePermission.CareerTitlefilePublish);

describe('The titles with the state of their career path (FR-113)', () => {
  const t = useTestApp();

  async function setup() {
    const s = await chainScenario(t);
    const hr = await t.factories.signIn(await t.factories.user({ grants: HR }));
    const list = async (query = ''): Promise<Paginated<CareerTitleListItemDto>> => (await hr.get(`/api/career/titles${query}`).expect(200)).body;
    const byId = (page: Paginated<CareerTitleListItemDto>, id: string) => page.items.find((i) => i.id === id);
    return { ...s, hr, list, byId };
  }

  it('lists every title with its unit, grade, track and path state (none, draft, ready), version and holders', async () => {
    const s = await setup();
    await s.hr.put(`/api/career/titles/${s.lead.id}/content`).send({ content: complete }).expect(200);
    await s.hr.put(`/api/career/titles/${s.rep.id}/content`).send({ content: complete }).expect(200);
    await s.hr.post(`/api/career/titles/${s.rep.id}/publish`).expect(200);
    await s.person(s.rep, s.group);
    const page = await s.list();
    expect(s.byId(page, s.head.id)).toMatchObject({ status: 'none', version: 0, holders: 0, grade: 4, track: 'M', code: s.head.code, unitNameEn: 'Sales' });
    expect(s.byId(page, s.lead.id)).toMatchObject({ status: 'draft', version: 1 });
    expect(s.byId(page, s.rep.id)).toMatchObject({ status: 'ready', version: 1, holders: 1, grade: 7, track: 'P' });
    expect(page.total).toBeGreaterThanOrEqual(3);
    expect(s.byId(page, s.rep.id)?.updatedAt).not.toBeNull();
  });

  it('filters by the path state, grade, track and unit (a unit and the units below it), and searches by name and by code', async () => {
    const s = await setup();
    await s.hr.put(`/api/career/titles/${s.lead.id}/content`).send({ content: complete }).expect(200);
    const ids = async (query: string) => (await s.list(query)).items.map((i) => i.id);
    expect(await ids('?status=draft')).toEqual([s.lead.id]);
    expect(await ids('?status=ready')).toEqual([]);
    expect(await ids('?status=none')).toEqual(expect.arrayContaining([s.head.id, s.rep.id]));
    expect(await ids('?status=none')).not.toContain(s.lead.id);
    expect(await ids(`?orgNodeId=${s.dept.id}&grade=7`)).toEqual([s.rep.id]);
    expect(await ids(`?orgNodeId=${s.dept.id}&track=M`)).toEqual(expect.arrayContaining([s.head.id, s.lead.id]));
    expect(await ids(`?orgNodeId=${s.dept.id}&track=M`)).not.toContain(s.rep.id);
    expect(await ids(`?orgNodeId=${s.sector.id}&grade=7`)).toContain(s.rep.id); // a unit above reaches it
    expect(await ids(`?orgNodeId=${s.sector.id}&grade=3`)).toEqual([]);
    expect(await ids(`?search=${encodeURIComponent(s.rep.code as string)}`)).toEqual([s.rep.id]);
    expect(await ids(`?search=${encodeURIComponent('Lead')}`)).toEqual([s.lead.id]);
    expect(await ids(`?search=${encodeURIComponent('%')}`)).toEqual([]); // a percent sign is text, not a wildcard
  });

  it('pages the result with the total of all that match', async () => {
    const s = await setup();
    const all = await s.list(`?orgNodeId=${s.dept.id}&pageSize=100`);
    const n = all.total;
    expect(n).toBeGreaterThanOrEqual(3);
    expect(all.items).toHaveLength(n);
    const first = await s.list(`?orgNodeId=${s.dept.id}&pageSize=2&page=1`);
    const second = await s.list(`?orgNodeId=${s.dept.id}&pageSize=2&page=2`);
    expect(first).toMatchObject({ total: n, page: 1, pageSize: 2 });
    expect(first.items).toHaveLength(2);
    expect(second.items).toHaveLength(Math.min(2, n - 2));
    // the pages follow the same order as the whole list, with no title twice
    expect([...first.items, ...second.items].map((i) => i.id)).toEqual(all.items.slice(0, 2 + second.items.length).map((i) => i.id));
    expect((await s.list(`?orgNodeId=${s.dept.id}&pageSize=2&page=99`)).items).toEqual([]);
  });

  it('validates the query (400) and answers 403 without the view key', async () => {
    const s = await setup();
    for (const q of ['?status=archived', '?grade=0', '?grade=10', '?track=X', '?orgNodeId=nope', '?pageSize=101', '?extra=1']) await s.hr.get(`/api/career/titles${q}`).expect(400);
    const denied = await t.factories.signIn(await t.factories.user({ grants: grants(CorePermission.CareerContentEdit) }));
    await denied.get('/api/career/titles').expect(403);
  });
});
