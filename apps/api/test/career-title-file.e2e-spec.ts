import { CorePermission, TITLE_FILE_MAX_CHARS, type CareerTitleContentDto, type PermissionGrant, type TitleFileResultDto } from '@arweqah-platform/shared';
import { describe, expect, it, vi } from 'vitest';
import { SAMPLE_TITLE_FILE } from '../src/modules/career-profile/domain/rules/fixtures/title-file.sample';
import { chainScenario } from './helpers/title-chain';
import { useTestApp } from './setup/test-app';

const KEYS = [CorePermission.CareerContentView, CorePermission.CareerTitlefileUpload];
const grants = (without?: string): PermissionGrant[] => KEYS.filter((k) => k !== without).map((key) => ({ key, scope: 'all' as const }));

describe('Reading a title file into the career content (FR-113)', () => {
  const t = useTestApp();

  async function setup(withGrants: PermissionGrant[] = grants()) {
    const s = await chainScenario(t);
    const hr = await t.factories.signIn(await t.factories.user({ grants: withGrants }));
    const url = (id = s.head.id) => `/api/career/titles/${id}`;
    /** The sample file of the concept with the title's own code, so nothing in it is wrong. */
    const file = SAMPLE_TITLE_FILE.replaceAll('OPS.01.01.01-L9P-01', s.head.code as string);
    const stored = async () => (await hr.get(`${url()}/content`).expect(200)).body as CareerTitleContentDto;
    return { ...s, hr, url, file, stored };
  }

  it('reports what a file holds on a dry run (the default) and saves nothing', async () => {
    const s = await setup();
    const res = (await s.hr.post(`${s.url()}/file`).send({ text: s.file }).expect(200)).body as TitleFileResultDto;
    expect(res).toMatchObject({ dryRun: true, saved: false, version: null, problems: [], codeInFile: s.head.code });
    expect(res.counts).toMatchObject({ indicators: 3, responsibilities: 4, tasks: 12, ladderLevels: 7, pathSteps: 4, competencies: 13, badges: 4, learningPeriods: 3, requiredItems: 6 });
    expect(res.ignored).toContain('التالي');
    expect(await s.stored()).toMatchObject({ version: 0 });
    expect((await s.hr.post(`${s.url()}/file`).send({ text: s.file, dryRun: true }).expect(200)).body).toMatchObject({ saved: false });
  });

  it('saves the content a file says as a new version, and a second file replaces it as the next one', async () => {
    const s = await setup();
    const res = (await s.hr.post(`${s.url()}/file`).send({ text: s.file, dryRun: false }).expect(200)).body as TitleFileResultDto;
    expect(res).toMatchObject({ dryRun: false, saved: true, version: 1, problems: [] });
    const first = await s.stored();
    expect(first).toMatchObject({ version: 1, status: 'draft', problems: [] });
    expect(first.content.summary).toContain('تنسيق ودعم أعمال وحدة الاستقطاب');
    expect(first.content.ladder[0]).toEqual({ level: 'L9', title: 'منسق الاستقطاب', current: true });
    expect(first.content.learning.badges.map((b) => b.hours)).toEqual([35, 65, 115, 120]);
    expect(first.content.learning.periods.map((p) => p.name)).toEqual(['السنة 1', 'السنة 2', 'ما بعد السنة 2']);
    expect(first.content.learning.periods.flatMap((p) => p.units).every((u) => /^[0-9a-f-]{36}$/.test(u.id ?? ''))).toBe(true);
    expect(first.content.required.map((r) => r.deadline)).toEqual(['2026-10-15', '2026-11-15', '2027-03-31', '2027-03-31', '2027-04-30', null]);
    const again = s.file.replace('تنسيق ودعم أعمال وحدة الاستقطاب', 'ملخص معدّل');
    expect(((await s.hr.post(`${s.url()}/file`).send({ text: again, dryRun: false }).expect(200)).body as TitleFileResultDto).version).toBe(2);
    expect((await s.stored()).content.summary).toContain('ملخص معدّل');
    const rows = (await t.db.query('SELECT version FROM career_title_content_versions WHERE title_id = $1 ORDER BY version', [s.head.id])) as { version: number }[];
    expect(rows.map((r) => r.version)).toEqual([1, 2]);
  });

  it('refuses to save a file with a part that needs review (422 TITLE_FILE_NEEDS_REVIEW) and keeps what is stored', async () => {
    const s = await setup();
    await s.hr.post(`${s.url()}/file`).send({ text: s.file, dryRun: false }).expect(200);
    const partial = (SAMPLE_TITLE_FILE.split('التطوير المهني')[0] as string).replace('OPS.01.01.01-L9P-01', s.head.code as string);
    const res = await s.hr.post(`${s.url()}/file`).send({ text: partial, dryRun: false }).expect(422);
    expect(res.body).toMatchObject({ code: 'TITLE_FILE_NEEDS_REVIEW', details: { problems: expect.arrayContaining(['current_title_unmarked', 'learning_missing', 'required_missing']) } });
    expect(await s.stored()).toMatchObject({ version: 1 });
    // the same file on a dry run is only reported
    expect(((await s.hr.post(`${s.url()}/file`).send({ text: partial }).expect(200)).body as TitleFileResultDto).problems).toContain('current_title_unmarked');
  });

  it('flags the code of another title in the file, and refuses to save it', async () => {
    const s = await setup();
    const wrong = SAMPLE_TITLE_FILE; // carries OPS.01.01.01-L9P-01, which is not the code of this title
    expect(((await s.hr.post(`${s.url()}/file`).send({ text: wrong }).expect(200)).body as TitleFileResultDto)).toMatchObject({ problems: ['code_mismatch'], codeInFile: 'OPS.01.01.01-L9P-01' });
    await s.hr.post(`${s.url()}/file`).send({ text: wrong, dryRun: false }).expect(422);
    expect(await s.stored()).toMatchObject({ version: 0 });
  });

  it('validates the body (400): empty text, too long, an unknown field, a dryRun that is not a boolean', async () => {
    const s = await setup();
    const post = (body: unknown) => s.hr.post(`${s.url()}/file`).send(body as object);
    await post({ text: '' }).expect(400);
    await post({}).expect(400);
    await post({ text: 'ا'.repeat(TITLE_FILE_MAX_CHARS + 1) }).expect(400);
    await post({ text: 'x', extra: 1 }).expect(400);
    await post({ text: 'x', dryRun: 'false' }).expect(400);
    await s.hr.post('/api/career/titles/not-a-uuid/file').send({ text: 'x' }).expect(400);
  });

  it('answers 404 for a title that does not exist, and 403 to a person without the upload key', async () => {
    const s = await setup();
    await s.hr.post(`${s.url('00000000-0000-4000-8000-000000000999')}/file`).send({ text: s.file }).expect(404);
    const denied = await setup(grants(CorePermission.CareerTitlefileUpload));
    await denied.hr.post(`${denied.url()}/file`).send({ text: denied.file }).expect(403);
  });

  it('writes the audit entry of an upload with the counts and without any of the file text', async () => {
    const s = await setup();
    await s.hr.post(`${s.url()}/file`).send({ text: s.file, dryRun: false }).expect(200);
    const rows = await vi.waitFor(async () => {
      const found = (await t.db.query(`SELECT action, changes FROM audit_logs WHERE action = 'career.content.file_uploaded'`)) as { action: string; changes: Record<string, unknown> }[];
      expect(found).toHaveLength(1);
      return found;
    });
    expect(rows[0]?.changes).toMatchObject({ version: 1, indicators: 3 });
    expect(JSON.stringify(rows)).not.toContain('تنسيق ودعم');
  });
});
