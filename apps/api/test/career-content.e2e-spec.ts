import { CorePermission, EMPTY_CAREER_CONTENT, type CareerContent, type CareerTitleContentDto, type PermissionGrant } from '@arweqah-platform/shared';
import { describe, expect, it, vi } from 'vitest';
import { complete } from './helpers/career-content';
import { chainScenario } from './helpers/title-chain';
import { useTestApp } from './setup/test-app';

const KEYS = [CorePermission.CareerContentView, CorePermission.CareerContentEdit, CorePermission.CareerTitlefilePublish, CorePermission.CareerTitlefilePreview];
const grants = (without?: string): PermissionGrant[] => KEYS.filter((k) => k !== without).map((key) => ({ key, scope: 'all' as const }));

describe('Career-path content of a job title (FR-111, FR-113)', () => {
  const t = useTestApp();

  async function setup(withGrants: PermissionGrant[] = grants()) {
    const s = await chainScenario(t);
    const user = await t.factories.user({ grants: withGrants });
    const hr = await t.factories.signIn(user);
    return { ...s, hr, url: (id = s.head.id) => `/api/career/titles/${id}` };
  }

  it('reads an empty document for a title that has none yet (version 0, draft, every section missing)', async () => {
    const s = await setup();
    const res = await s.hr.get(`${s.url()}/content`).expect(200);
    const body = res.body as CareerTitleContentDto;
    expect(body).toMatchObject({ titleId: s.head.id, titleCode: s.head.code, version: 0, status: 'draft', updatedAt: null, problems: ['description', 'development', 'learning', 'required'] });
    expect(body.content).toEqual(EMPTY_CAREER_CONTENT);
  });

  it('saves the whole document, starts at version 1, grows by one per save and keeps a snapshot of each version', async () => {
    const s = await setup();
    const first = (await s.hr.put(`${s.url()}/content`).send({ content: complete, expectedVersion: 0 }).expect(200)).body as CareerTitleContentDto;
    expect(first).toMatchObject({ version: 1, status: 'draft', problems: [] });
    const unit = first.content.learning.periods[0]!.units[0]!;
    expect(unit.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(first.content).toEqual({ ...complete, learning: { ...complete.learning, periods: [{ name: 'السنة 1', units: [{ ...complete.learning.periods[0]!.units[0]!, id: unit.id }] }] } });
    const second = (await s.hr.put(`${s.url()}/content`).send({ content: { ...complete, summary: 'ملخص معدّل' }, expectedVersion: 1 }).expect(200)).body as CareerTitleContentDto;
    expect(second.version).toBe(2);
    const versions = (await t.db.query('SELECT version, content FROM career_title_content_versions WHERE title_id = $1 ORDER BY version', [s.head.id])) as { version: number; content: CareerContent }[];
    expect(versions.map((v) => v.version)).toEqual([1, 2]);
    expect(versions[0]!.content.summary).toBe(complete.summary);
    expect(versions[1]!.content.summary).toBe('ملخص معدّل');
    expect(((await s.hr.get(`${s.url()}/content`).expect(200)).body as CareerTitleContentDto).version).toBe(2);
  });

  it('gives each learning unit an id once and keeps it in the later saves, a new unit getting its own', async () => {
    const s = await setup();
    const first = (await s.hr.put(`${s.url()}/content`).send({ content: complete }).expect(200)).body as CareerTitleContentDto;
    const unit = first.content.learning.periods[0]!.units[0]!;
    const kept = (await s.hr.put(`${s.url()}/content`).send({ content: { ...first.content, learning: { ...first.content.learning, periods: [{ name: 'السنة 1', units: [unit, { ...unit, id: undefined, title: 'وحدة ثانية' }] }] } } }).expect(200)).body as CareerTitleContentDto;
    const ids = kept.content.learning.periods[0]!.units.map((u) => u.id);
    expect(ids[0]).toBe(unit.id);
    expect(ids[1]).toMatch(/^[0-9a-f-]{36}$/);
    expect(ids[1]).not.toBe(unit.id);
  });

  it('refuses a save made on an older version (409 CAREER_CONTENT_STALE) and keeps what is stored', async () => {
    const s = await setup();
    await s.hr.put(`${s.url()}/content`).send({ content: complete }).expect(200);
    await s.hr.put(`${s.url()}/content`).send({ content: { ...complete, summary: 'ب' }, expectedVersion: 1 }).expect(200);
    const res = await s.hr.put(`${s.url()}/content`).send({ content: { ...complete, summary: 'ج' }, expectedVersion: 1 }).expect(409);
    expect(res.body).toMatchObject({ code: 'CAREER_CONTENT_STALE' });
    expect(((await s.hr.get(`${s.url()}/content`).expect(200)).body as CareerTitleContentDto).content.summary).toBe('ب');
  });

  it('never loses a version when two first saves of a title arrive together', async () => {
    const s = await setup();
    const save = (summary: string) => s.hr.put(`${s.url()}/content`).send({ content: { ...complete, summary } });
    const results = await Promise.all([save('أ'), save('ب'), save('ج')]);
    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    const rows = (await t.db.query('SELECT version FROM career_title_content_versions WHERE title_id = $1 ORDER BY version', [s.head.id])) as { version: number }[];
    expect(rows.map((r) => r.version)).toEqual([1, 2, 3]);
  });

  it('validates the document (400): an unknown field, a bad level, a bad date, too many steps and an empty line', async () => {
    const s = await setup();
    const put = (content: unknown) => s.hr.put(`${s.url()}/content`).send({ content });
    await put({ ...complete, extra: 1 }).expect(400);
    await put({ ...complete, ladder: [{ level: 'L10', title: 'x', current: true }] }).expect(400);
    await put({ ...complete, required: [{ when: 'x', lines: ['y'], deadline: '15/10/2026' }] }).expect(400);
    await put({ ...complete, steps: Array.from({ length: 10 }, (_, i) => ({ n: (i % 9) + 1, label: 'a', title: 'b', meta: 'c' })) }).expect(400);
    await put({ ...complete, kpis: [{ text: '   ', governing: false }] }).expect(400);
    await s.hr.put(`${s.url()}/content`).send({ content: complete, expectedVersion: -1 }).expect(400);
    await s.hr.get('/api/career/titles/not-a-uuid/content').expect(400);
  });

  it('sets a complete path ready and back to draft, and refuses an incomplete one with the missing sections (422)', async () => {
    const s = await setup();
    const none = await s.hr.post(`${s.url()}/publish`).expect(422);
    expect(none.body).toMatchObject({ code: 'CAREER_CONTENT_NOT_READY', details: { problems: ['description', 'development', 'learning', 'required'] } });
    await s.hr.put(`${s.url()}/content`).send({ content: { ...complete, ackText: '', ladder: [] } }).expect(200);
    const partial = await s.hr.post(`${s.url()}/publish`).expect(422);
    expect(partial.body).toMatchObject({ details: { problems: ['development', 'required'] } });
    await s.hr.put(`${s.url()}/content`).send({ content: complete }).expect(200);
    expect(((await s.hr.post(`${s.url()}/publish`).expect(200)).body as CareerTitleContentDto).status).toBe('ready');
    expect(((await s.hr.post(`${s.url()}/draft`).expect(200)).body as CareerTitleContentDto).status).toBe('draft');
    expect(((await s.hr.post(`${s.url()}/draft`).expect(200)).body as CareerTitleContentDto)).toMatchObject({ status: 'draft', version: 2 });
  });

  it('answers 404 for a title that does not exist and a draft of a title with no content is an empty draft', async () => {
    const s = await setup();
    const unknown = '00000000-0000-4000-8000-000000000999';
    await s.hr.get(`${s.url(unknown)}/content`).expect(404);
    await s.hr.put(`${s.url(unknown)}/content`).send({ content: complete }).expect(404);
    await s.hr.post(`${s.url(unknown)}/publish`).expect(404);
    expect(((await s.hr.post(`${s.url(s.lead.id)}/draft`).expect(200)).body as CareerTitleContentDto)).toMatchObject({ version: 0, status: 'draft' });
  });

  it.each([
    ['view', CorePermission.CareerContentView, (s: Awaited<ReturnType<typeof setup>>) => s.hr.get(`${s.url()}/content`)],
    ['save', CorePermission.CareerContentEdit, (s: Awaited<ReturnType<typeof setup>>) => s.hr.put(`${s.url()}/content`).send({ content: complete })],
    ['publish', CorePermission.CareerTitlefilePublish, (s: Awaited<ReturnType<typeof setup>>) => s.hr.post(`${s.url()}/publish`)],
    ['draft', CorePermission.CareerTitlefilePublish, (s: Awaited<ReturnType<typeof setup>>) => s.hr.post(`${s.url()}/draft`)],
  ])('answers 403 to a person without the key of %s', async (_name, key, call) => {
    const s = await setup(grants(key));
    await call(s).expect(403);
  });

  it('writes the audit entries of a save, a publication and a draft (no content text in them)', async () => {
    const s = await setup();
    await s.hr.put(`${s.url()}/content`).send({ content: complete }).expect(200);
    await s.hr.post(`${s.url()}/publish`).expect(200);
    await s.hr.post(`${s.url()}/draft`).expect(200);
    const rows = await vi.waitFor(async () => {
      const found = (await t.db.query(`SELECT action, changes FROM audit_logs WHERE entity_type = 'career_title_content' ORDER BY created_at`)) as { action: string; changes: Record<string, unknown> }[];
      expect(found).toHaveLength(3);
      return found;
    });
    expect(rows.map((r) => r.action)).toEqual(['career.content.saved', 'career.content.published', 'career.content.drafted']);
    expect(JSON.stringify(rows)).not.toContain(complete.summary);
  });
});
