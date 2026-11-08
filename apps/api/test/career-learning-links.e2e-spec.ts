import { CorePermission, type CareerTitleContentDto, type LearningImportResultDto, type PermissionGrant } from '@arweqah-platform/shared';
import { describe, expect, it, vi } from 'vitest';
import { complete } from './helpers/career-content';
import { chainScenario } from './helpers/title-chain';
import { useTestApp } from './setup/test-app';

const KEYS = [CorePermission.CareerContentView, CorePermission.CareerContentEdit, CorePermission.CareerContentImport];
const grants = (without?: string): PermissionGrant[] => KEYS.filter((k) => k !== without).map((key) => ({ key, scope: 'all' as const }));
const PERIOD = complete.learning.periods[0]!.name;
const UNIT = complete.learning.periods[0]!.units[0]!.title;

describe('The learning-links sheet (FR-113)', () => {
  const t = useTestApp();

  async function setup(withGrants: PermissionGrant[] = grants()) {
    const s = await chainScenario(t);
    const hr = await t.factories.signIn(await t.factories.user({ grants: withGrants }));
    await hr.put(`/api/career/titles/${s.rep.id}/content`).send({ content: complete }).expect(200);
    const row = (over: object = {}) => ({ titleCode: s.rep.code, period: PERIOD, unit: UNIT, link: 'https://learn.example/unit', ...over });
    const post = (rows: object[], dryRun?: boolean) => hr.post('/api/career/learning-links').send(dryRun === undefined ? { rows } : { rows, dryRun });
    const stored = async () => (await hr.get(`/api/career/titles/${s.rep.id}/content`).expect(200)).body as CareerTitleContentDto;
    return { ...s, hr, row, post, stored };
  }

  it('reports what each row would do on a dry run (the default) and changes nothing', async () => {
    const s = await setup();
    const res = (await s.post([s.row(), s.row({ titleCode: 'XX.00.00.00-L1M-01' })]).expect(200)).body as LearningImportResultDto;
    expect(res).toMatchObject({ dryRun: true, updated: 1, unchanged: 0, rejected: 1 });
    expect(res.rows).toEqual([{ row: 1, status: 'updated', reason: null }, { row: 2, status: 'rejected', reason: 'title_not_found' }]);
    expect((await s.stored()).version).toBe(1);
  });

  it('sets the link of the unit, saves a new version and keeps the unit\'s id and everything else', async () => {
    const s = await setup();
    const before = (await s.stored()).content.learning.periods[0]!.units[0]!;
    const res = (await s.post([s.row()], false).expect(200)).body as LearningImportResultDto;
    expect(res).toMatchObject({ dryRun: false, updated: 1, rejected: 0 });
    const after = await s.stored();
    expect(after.version).toBe(2);
    expect(after.content.learning.periods[0]!.units[0]).toEqual({ ...before, link: 'https://learn.example/unit' });
    expect(after.content.summary).toBe(complete.summary);
    // the same sheet again changes nothing and saves no version
    expect(((await s.post([s.row()], false).expect(200)).body as LearningImportResultDto)).toMatchObject({ updated: 0, unchanged: 1 });
    expect((await s.stored()).version).toBe(2);
    // an empty link clears it
    await s.post([s.row({ link: '' })], false).expect(200);
    expect((await s.stored()).content.learning.periods[0]!.units[0]!.link).toBe('');
  });

  it('refuses rows that name no title, no content, no period or no unit, and a unit named twice', async () => {
    const s = await setup();
    const res = (await s.post([s.row({ period: 'السنة 9' }), s.row({ unit: 'لا وحدة' }), s.row({ titleCode: s.head.code }), s.row(), s.row({ link: 'https://other.example' })]).expect(200)).body as LearningImportResultDto;
    expect(res.rows.map((r) => r.reason)).toEqual(['period_not_found', 'unit_not_found', 'no_content', null, 'duplicate_row']);
  });

  it('validates the body (400): an empty list, a link that is not https, an unknown field, a dryRun that is not a boolean, too many rows', async () => {
    const s = await setup();
    await s.post([]).expect(400);
    await s.post([s.row({ link: 'http://insecure.example' })]).expect(400);
    await s.post([s.row({ link: 'javascript:alert(1)' })]).expect(400);
    await s.post([{ ...s.row(), extra: 1 }]).expect(400);
    await s.hr.post('/api/career/learning-links').send({ rows: [s.row()], dryRun: 'no' }).expect(400);
    await s.post(Array.from({ length: 1001 }, () => s.row())).expect(400);
  });

  it('answers 403 without the import key, and writes an audit entry of a real import without the links', async () => {
    const denied = await setup(grants(CorePermission.CareerContentImport));
    await denied.post([denied.row()]).expect(403);
    const s = await setup();
    await s.post([s.row()], false).expect(200);
    const rows = await vi.waitFor(async () => {
      const found = (await t.db.query(`SELECT changes FROM audit_logs WHERE action = 'career.learning_links.imported'`)) as { changes: Record<string, unknown> }[];
      expect(found).toHaveLength(1);
      return found;
    });
    expect(rows[0]?.changes).toMatchObject({ updated: 1, unchanged: 0, rejected: 0 });
    expect(JSON.stringify(rows)).not.toContain('learn.example');
  });
});
