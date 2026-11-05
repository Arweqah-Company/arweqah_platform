import { CorePermission, EMPTY_CHARTER, type OrgCharter, type OrgNodeVersionsDto, type OrgTreeDto } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { todayInRiyadh } from '../src/common/domain/riyadh-date';
import { OrgVersionsService } from '../src/modules/org/application/services/org-versions.service';
import { dayBefore } from '../src/common/domain/dates';
import { dayFromToday } from './helpers/hr-scenario';
import { orgAdmin, orgContext, orgGrantsWithout } from './helpers/org-admin';
import { useTestApp } from './setup/test-app';

const charter = (purpose: string): Omit<OrgCharter, never> => ({
  ...EMPTY_CHARTER,
  purpose: { ar: `${purpose} ع`, en: purpose },
  outputs: { ar: ['مخرج'], en: ['An output'] },
});

describe('Dated versions and the charter of a unit (FR-99)', () => {
  const t = useTestApp();

  async function setup() {
    const org = await t.factories.org();
    const { agent } = await orgAdmin(t);
    const route = `/api/org/nodes/${org.sectionAB}`;
    const versions = async (): Promise<OrgNodeVersionsDto> => (await agent.get(`${route}/versions`).expect(200)).body;
    const node = async () => ((await agent.get('/api/org/tree?view=full').expect(200)).body as OrgTreeDto).nodes.find((n) => n.id === org.sectionAB)!;
    const rename = (nameEn: string, extra: Record<string, unknown> = {}) =>
      agent.put(route).send({ nameAr: `${nameEn} ع`, nameEn, startDate: '2024-01-01', isActive: true, ...extra });
    return { org, agent, route, versions, node, rename };
  }

  it('shows a unit that has no stored version as one entry in force, and keeps yesterday\'s record when it is renamed today (the old name stays in the history)', async () => {
    const { versions, rename, node } = await setup();
    const first = await versions();
    expect(first.versions).toHaveLength(1);
    expect(first.versions[0]).toMatchObject({ id: null, status: 'current', nameEn: 'Section AB' });
    await rename('Renamed section').expect(200);
    const after = await versions();
    expect(after.versions.map((v) => [v.nameEn, v.status])).toEqual([['Renamed section', 'current'], ['Section AB', 'past']]);
    expect(after.versions[1]).toMatchObject({ validFrom: '2024-01-01', validTo: dayBefore(todayInRiyadh()) });
    expect(after.versions[0]).toMatchObject({ validFrom: todayInRiyadh(), validTo: null, reason: 'Edited from the unit form' });
    expect((await node()).nameEn).toBe('Renamed section');
  });

  it('corrects the version of the same day instead of adding one, and never rewrites the earlier one', async () => {
    const { versions, rename } = await setup();
    await rename('First', { reason: 'one' }).expect(200);
    await rename('Second', { reason: 'two' }).expect(200);
    const after = await versions();
    expect(after.versions.map((v) => v.nameEn)).toEqual(['Second', 'Section AB']);
    expect(after.versions[0]?.reason).toBe('two');
    expect(after.versions[1]?.validTo).toBe(dayBefore(todayInRiyadh()));
  });

  it('records a future rename as a scheduled version, flags the unit, and the nightly job applies it on its day (once)', async () => {
    const { versions, rename, node } = await setup();
    const day = dayFromToday(10);
    await rename('Future name', { effectiveFrom: day, reason: 'Rebranding' }).expect(200);
    expect((await node()).nameEn).toBe('Section AB');
    expect((await node()).hasScheduledChange).toBe(true);
    const waiting = await versions();
    expect(waiting.versions.map((v) => [v.nameEn, v.status, v.validFrom])).toEqual([['Future name', 'scheduled', day], ['Section AB', 'current', expect.any(String)]]);
    const service = t.app.get(OrgVersionsService);
    expect(await service.applyDue(dayFromToday(9))).toBe(0);
    expect((await node()).nameEn).toBe('Section AB');
    expect(await service.applyDue(day)).toBeGreaterThanOrEqual(1);
    expect((await node()).nameEn).toBe('Future name');
    expect(await service.applyDue(day)).toBe(0);
  });

  it('switches a unit off by a date instead of deleting it: it stays on until the day, and the history keeps it', async () => {
    const { versions, rename, node } = await setup();
    const day = dayFromToday(5);
    await rename('Section AB', { isActive: false, effectiveFrom: day, reason: 'Merged next week' }).expect(200);
    expect((await node()).isActive).toBe(true);
    await t.app.get(OrgVersionsService).applyDue(day);
    expect((await node()).isActive).toBe(false);
    const after = await versions();
    expect(after.versions.map((v) => [v.isActive, v.validFrom])).toEqual([[false, day], [true, expect.any(String)]]);
    expect(after.versions[1]?.validTo).toBe(dayBefore(day));
  });

  it('writes the charter now or on a day, keeps the earlier one in the history, and returns the log of the unit', async () => {
    const { agent, route, versions } = await setup();
    const res = await agent.put(`${route}/charter`).send({ ...charter('Run the section'), reason: 'First charter' }).expect(200);
    expect(res.body.charter.purpose.en).toBe('Run the section');
    const day = dayFromToday(3);
    await agent.put(`${route}/charter`).send({ ...charter('New purpose'), effectiveFrom: day, reason: 'Next quarter' }).expect(200);
    const after = await versions();
    expect(after.charter?.purpose.en).toBe('Run the section');
    expect(after.versions.map((v) => [v.charter?.purpose.en ?? null, v.status])).toEqual([['New purpose', 'scheduled'], ['Run the section', 'current'], [null, 'past']]);
    await t.app.get(OrgVersionsService).applyDue(day);
    expect((await versions()).charter?.purpose.en).toBe('New purpose');
  });

  it('refuses a date in the past (422), a date before the last version (422), and a change without a reason or with a bad shape (400)', async () => {
    const { agent, route, rename } = await setup();
    const body = { ...charter('X'), reason: 'why' };
    expect((await agent.put(`${route}/charter`).send({ ...body, effectiveFrom: dayFromToday(-1) }).expect(422)).body.code).toBe('ORG_VERSION_IN_THE_PAST');
    await agent.put(`${route}/charter`).send({ ...body, effectiveFrom: dayFromToday(10) }).expect(200);
    expect((await agent.put(`${route}/charter`).send({ ...body, effectiveFrom: dayFromToday(5) }).expect(422)).body.code).toBe('ORG_VERSION_DATE_NOT_AFTER');
    await agent.put(`${route}/charter`).send({ ...charter('X') }).expect(400);
    await agent.put(`${route}/charter`).send({ ...body, outputs: { ar: [''], en: [] } }).expect(400);
    await agent.put(`${route}/charter`).send({ ...body, extra: 1 }).expect(400);
    await rename('Other', { effectiveFrom: dayFromToday(20) }).expect(400);
    expect((await rename('Other', { effectiveFrom: dayFromToday(-2), reason: 'late' }).expect(422)).body.code).toBe('ORG_VERSION_IN_THE_PAST');
  });

  it('two charter edits for the same day made at once leave one version for that day (no overlap)', async () => {
    const { org } = await setup();
    const service = t.app.get(OrgVersionsService);
    const ctx = orgContext();
    const edit = (purpose: string) => service.updateCharter(ctx, org.sectionAB, { ...charter(purpose), reason: 'race' }, '00000000-0000-4000-8000-0000000000aa');
    await Promise.all([edit('A'), edit('B')]);
    const rows: { valid_from: string }[] = await t.db.query(`SELECT to_char(valid_from, 'YYYY-MM-DD') AS valid_from FROM org_node_versions WHERE node_id = $1 ORDER BY valid_from`, [org.sectionAB]);
    expect(rows.map((r) => r.valid_from)).toEqual(['2024-01-01', todayInRiyadh()]);
  });

  it('403 without the charter key, and the unit is 404 for a person who does not see it; 403 without org.view', async () => {
    const { org, route } = await setup();
    const noCharter = (await orgAdmin(t, orgGrantsWithout(CorePermission.OrgCharterEdit))).agent;
    await noCharter.put(`${route}/charter`).send({ ...charter('X'), reason: 'why' }).expect(403);
    const plain = await t.factories.signIn(await t.factories.user({ unit: org.unitA }));
    await plain.get(`${route}/versions`).expect(200); // a unit above their own is visible
    await plain.get(`/api/org/nodes/${org.otherDepartment}/versions`).expect(404);
    await plain.put(`${route}/charter`).send({ ...charter('X'), reason: 'why' }).expect(403);
    const bare = await t.factories.signIn(await t.factories.user({ bare: true }));
    await bare.get(`${route}/versions`).expect(403);
  });
});
