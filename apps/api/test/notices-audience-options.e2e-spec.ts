import type { NoticeAudienceOptionsDto } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { noticeWorld } from './helpers/notices';
import { useTestApp } from './setup/test-app';

describe('Notices: the audience options any writer can pick from (FR-168)', () => {
  const t = useTestApp();

  it('gives a plain writer the units, every job title and the groups of people with their member counts', async () => {
    const w = await noticeWorld(t);
    const [group]: { id: string }[] = await t.db.query(`INSERT INTO user_groups (name_ar, name_en) VALUES ('مجموعة الاختبار', 'Pilot group') RETURNING id`);
    await t.db.query('INSERT INTO user_group_members (group_id, user_id) VALUES ($1, $2), ($1, $3)', [group?.id, w.writer.id, w.employee.id]);
    const options = (await w.agents.writer.get('/api/notices/audience/options').expect(200)).body as NoticeAudienceOptionsDto;
    expect(options.units.map((u) => u.id)).toEqual(expect.arrayContaining([w.org.unitA.id, w.org.unitB.id, w.org.unitC.id]));
    expect(options.units.find((u) => u.id === w.org.unitA.id)).toMatchObject({ nameEn: 'Unit A' });
    expect(options.titles.length).toBeGreaterThan(0);
    expect(options.titles[0]).toEqual(expect.objectContaining({ id: expect.any(String), nameAr: expect.any(String), unitNameEn: expect.any(String) }));
    expect(options.groups.find((g) => g.id === group?.id)).toEqual({ id: group?.id, nameAr: 'مجموعة الاختبار', nameEn: 'Pilot group', memberCount: 2 });
  });

  it('is not capped at a hundred job titles and narrows by name', async () => {
    const w = await noticeWorld(t);
    const unitId = w.org.unitA.id;
    await t.db.query(
      `WITH made AS (INSERT INTO job_titles (org_node_id, responsibilities, qualifications, kpis) SELECT $1, '[]', '[]', '[]' FROM generate_series(1, 120) RETURNING id)
       INSERT INTO job_title_translations (job_title_id, lang, name) SELECT id, 'ar', 'مسمى كثير ' || id FROM made`,
      [unitId],
    );
    const all = (await w.agents.writer.get('/api/notices/audience/options').expect(200)).body as NoticeAudienceOptionsDto;
    expect(all.titles.length).toBeGreaterThan(100);
    const found = (await w.agents.writer.get('/api/notices/audience/options').query({ search: 'Unit B' }).expect(200)).body as NoticeAudienceOptionsDto;
    expect(found.units.map((u) => u.nameEn)).toEqual(['Unit B']);
    const titles = (await w.agents.writer.get('/api/notices/audience/options').query({ search: 'مسمى كثير' }).expect(200)).body as NoticeAudienceOptionsDto;
    expect(titles.titles).toHaveLength(120);
    expect(titles.units).toHaveLength(0);
  });

  it('is 403 for an employee without the manage key, and refuses an unknown or too long query', async () => {
    const w = await noticeWorld(t);
    await w.agents.employee.get('/api/notices/audience/options').expect(403);
    await w.agents.writer.get('/api/notices/audience/options').query({ surprise: '1' }).expect(400);
    await w.agents.writer.get('/api/notices/audience/options').query({ search: 'x'.repeat(101) }).expect(400);
  });
});
