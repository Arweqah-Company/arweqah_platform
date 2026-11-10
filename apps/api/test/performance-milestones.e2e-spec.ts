import { CorePermission, type MilestoneListDto } from '@arweqah-platform/shared';
import { describe, expect, it, vi } from 'vitest';
import { evaluationScenario, grants } from './helpers/performance-keys';
import { useTestApp } from './setup/test-app';

const MANAGER = [CorePermission.PerformanceMilestoneView, CorePermission.PerformanceMilestoneRecord];
const OWN = [CorePermission.PerformanceMilestoneAck];
const REVIEW = { whereWeAre: 'نسير وفق الخطة', obstacle: 'ضيق الوقت', agreedAction: 'مراجعة الأولويات أسبوعيًا', note: '' };

describe('The milestones of the year: the manager records the minutes, the employee acknowledges (FR-121)', () => {
  const t = useTestApp();

  /** The employee (Rep) reports to the direct manager (Lead); the cycle is open. */
  async function setup() {
    const { hr, ...s } = await evaluationScenario(t);
    const managerUser = await s.person(s.lead, s.group, grants(MANAGER));
    const employeeUser = await s.person(s.rep, s.group, grants(OWN));
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [managerUser.employeeId, employeeUser.employeeId]);
    const manager = await t.factories.signIn(managerUser);
    const employee = await t.factories.signIn(employeeUser);
    await hr.post('/api/performance/cycle/open').send({ fiscalYear: 2026 }).expect(200);
    const base = `/api/performance/team/${employeeUser.employeeId}/milestones`;
    return { ...s, hr, manager, employee, employeeUser, base };
  }

  const state = (list: MilestoneListDto, key: string) => list.items.find((i) => i.key === key)!;

  it('lists the five milestones with their calendar and state: none, and the warning grade «does not run this year»', async () => {
    const s = await setup();
    const list = (await s.manager.get(s.base).expect(200)).body as MilestoneListDto;
    expect(list.fiscalYear).toBe(2026);
    expect(list.items.map((i) => [i.key, i.state])).toEqual([['review_jan', 'none'], ['pulse_mar', 'none'], ['review_jul', 'none'], ['pulse_sep', 'none'], ['warning_oct', 'skipped']]);
    expect(state(list, 'review_jul')).toMatchObject({ kind: 'review', month: 7, day: 15, record: null });
  });

  it('records the minutes of a review (the agreed action is required) and tells the employee; the employee sees them and acknowledges', async () => {
    const s = await setup();
    const saved = (await s.manager.put(`${s.base}/review_jul`).send(REVIEW).expect(200)).body as MilestoneListDto;
    expect(state(saved, 'review_jul')).toMatchObject({ state: 'recorded', record: { ...REVIEW, acknowledgedAt: null } });
    await vi.waitFor(async () => expect(((await s.employee.get('/api/notifications').expect(200)).body.items as { titleAr: string }[]).map((n) => n.titleAr)).toContain('سُجّل محضر محطة لك'));
    expect(state((await s.employee.get('/api/performance/me/milestones').expect(200)).body, 'review_jul').state).toBe('recorded');
    const read = (await s.employee.post('/api/performance/me/milestones/review_jul/acknowledge').expect(200)).body as MilestoneListDto;
    expect(state(read, 'review_jul')).toMatchObject({ state: 'acknowledged', record: { acknowledgedAt: expect.any(String) } });
    await vi.waitFor(async () => expect(await t.db.query(`SELECT 1 FROM audit_logs WHERE action = 'performance.milestone.acknowledged'`)).toHaveLength(1));
    const edited = (await s.manager.put(`${s.base}/review_jul`).send({ ...REVIEW, obstacle: 'تغيّر' }).expect(200)).body as MilestoneListDto;
    expect(state(edited, 'review_jul')).toMatchObject({ state: 'recorded', record: { obstacle: 'تغيّر', acknowledgedAt: null } }); // an edit asks for a new reading
  });

  it('takes a short note for a pulse and refuses incomplete minutes (422 MILESTONE_INVALID)', async () => {
    const s = await setup();
    expect((await s.manager.put(`${s.base}/review_jan`).send({ ...REVIEW, agreedAction: 'قصير' }).expect(422)).body).toMatchObject({ code: 'MILESTONE_INVALID', details: { problems: ['agreedAction'] } });
    expect((await s.manager.put(`${s.base}/pulse_mar`).send({ ...REVIEW, note: '' }).expect(422)).body).toMatchObject({ details: { problems: ['note'] } });
    const saved = (await s.manager.put(`${s.base}/pulse_mar`).send({ whereWeAre: '', obstacle: '', agreedAction: '', note: 'الأمور تسير جيدًا' }).expect(200)).body as MilestoneListDto;
    expect(state(saved, 'pulse_mar').state).toBe('recorded');
    await s.manager.put(`${s.base}/review_jan`).send({ ...REVIEW, extra: 1 }).expect(400);
  });

  it('answers 409 for the milestone that does not run, 404 for an unknown key, and 404 when the employee has nothing to acknowledge', async () => {
    const s = await setup();
    expect((await s.manager.put(`${s.base}/warning_oct`).send(REVIEW).expect(409)).body).toMatchObject({ code: 'MILESTONE_NOT_RUNNING' });
    await s.manager.put(`${s.base}/nonsense`).send(REVIEW).expect(404);
    await s.employee.post('/api/performance/me/milestones/review_jul/acknowledge').expect(404);
  });

  it('answers 403 without the keys and 404 for a person outside the scope or without a cycle', async () => {
    const s = await setup();
    await s.employee.get(s.base).expect(403);
    await s.employee.put(`${s.base}/review_jul`).send(REVIEW).expect(403);
    const viewOnly = await t.factories.signIn(await s.person(s.lead, s.group, grants([CorePermission.PerformanceMilestoneView])));
    await viewOnly.get(s.base).expect(200);
    await viewOnly.put(`${s.base}/review_jul`).send(REVIEW).expect(403);
    const outside = await t.factories.signIn(await t.factories.user({ grants: grants(MANAGER, 'unit') }));
    await outside.get(s.base).expect(404);
    await outside.put(`${s.base}/review_jul`).send(REVIEW).expect(404);
    const noKey = await t.factories.signIn(await t.factories.user({ grants: grants([CorePermission.PerformanceMilestoneAck]) }));
    await noKey.post('/api/performance/me/milestones/review_jul/acknowledge').expect(404); // holds the key, has no evaluation
  });

  it('has no milestones before a cycle is open (404)', async () => {
    const { hr: _hr, ...s } = await evaluationScenario(t);
    const manager = await t.factories.signIn(await s.person(s.lead, s.group, grants(MANAGER)));
    await manager.get(`/api/performance/team/${s.rep.id}/milestones`).expect(404);
  });
});
