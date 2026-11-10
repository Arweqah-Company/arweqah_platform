import { CorePermission, type ReminderInput } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { PerformanceReminderSendService } from '../src/modules/performance/application/services/performance-reminder-send.service';
import { evaluationScenario, grants } from './helpers/performance-keys';
import { useTestApp } from './setup/test-app';

const SELF: ReminderInput = { kind: 'self', on: true, days: [7, 1], titleAr: 'تذكير بتقييمك الذاتي', titleEn: '', bodyAr: 'اقترب آخر موعد للتقييم الذاتي', bodyEn: '' };
const APPR: ReminderInput = { kind: 'appr', on: true, days: [2], titleAr: 'معايرة واعتماد بانتظارك', titleEn: '', bodyAr: 'النتائج تنتظر قرارك', bodyEn: '' };
const MILE: ReminderInput = { kind: 'mile', on: true, days: [5], titleAr: 'محضر محطة ينتظرك', titleEn: '', bodyAr: 'سجّل محضر المحطة لفريقك', bodyEn: '' };
const MGR: ReminderInput = { kind: 'mgr', on: true, days: [2], titleAr: 'تقييم ينتظرك', titleEn: '', bodyAr: 'عندك تقييمات لم تُرسل', bodyEn: '' };

describe('Sending the automatic reminders of the cycle (FR-124)', () => {
  const t = useTestApp();

  /** The employee (Rep) reports to the direct manager (Lead); the self-evaluation deadline is 2026-11-17 (a Tuesday). */
  async function setup() {
    const s = await evaluationScenario(t);
    const managerUser = await s.person(s.lead, s.group, grants([CorePermission.PerformanceTeamView, CorePermission.PerformanceTeamEvaluate, CorePermission.PerformanceMilestoneRecord, CorePermission.PerformanceMilestoneView]));
    const employeeUser = await s.person(s.rep, s.group, grants([CorePermission.PerformanceSelfEvaluate]));
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [managerUser.employeeId, employeeUser.employeeId]);
    const manager = await t.factories.signIn(managerUser);
    const employee = await t.factories.signIn(employeeUser);
    await s.hr.post('/api/performance/cycle/open').send({ fiscalYear: 2026 }).expect(200);
    await s.hr.put('/api/performance/cycle/dates/self_deadline').send({ from: '2026-11-17', to: null }).expect(200);
    const reminders = await t.factories.signIn(await t.factories.user({ grants: grants([CorePermission.PerformanceRemindersManage]) }));
    const titles = async (agent: typeof employee) => ((await agent.get('/api/notifications').expect(200)).body.items as { titleAr: string }[]).map((n) => n.titleAr);
    return { ...s, reminders, manager, employee, employeeUser, managerUser, titles, sender: t.app.get(PerformanceReminderSendService) };
  }

  it('reminds the employee who has not sent on each of the days before the deadline, once a day, and not a day that is not one of them', async () => {
    const s = await setup();
    await s.reminders.post('/api/performance/cycle/reminders').send(SELF).expect(201);
    expect(await s.sender.run('2026-11-11')).toBe(0); // 6 days before: not one of 7, 1
    expect(await s.sender.run('2026-11-10')).toBeGreaterThanOrEqual(1); // 7 days before
    expect(await s.titles(s.employee)).toContain('تذكير بتقييمك الذاتي');
    expect(await s.sender.run('2026-11-10')).toBe(0); // never twice in a day
  });

  it('stops for the employee who sent their self-evaluation', async () => {
    const s = await setup();
    await s.reminders.post('/api/performance/cycle/reminders').send(SELF).expect(201);
    const dto = (await s.employee.get('/api/performance/me').expect(200)).body.evaluation;
    const form = { behaviours: Object.fromEntries(dto.template.behaviours.map((b: { code: string }) => [b.code, { level: 75, note: '' }])), achievements: Object.fromEntries(dto.template.criteria.map((_: unknown, i: number) => [String(i), 'أنجزت المطلوب'])), initIds: [], growthIds: [] };
    await s.employee.post('/api/performance/me/self/send').send(form).expect(200);
    await s.sender.run('2026-11-10');
    expect((await s.titles(s.employee)).filter((x) => x === 'تذكير بتقييمك الذاتي')).toHaveLength(0);
  });

  it('never sends on the weekend and never when the reminder is off, and tells nobody when no cycle is open', async () => {
    const s = await setup();
    const made = (await s.reminders.post('/api/performance/cycle/reminders').send(SELF).expect(201)).body;
    expect(await s.sender.run('2026-11-13')).toBe(0); // a Friday (4 days... not a day anyway), checked below on a day that is one
    await s.hr.put('/api/performance/cycle/dates/self_deadline').send({ from: '2026-11-20', to: null }).expect(200);
    expect(await s.sender.run('2026-11-13')).toBe(0); // 7 days before, but a Friday
    await s.reminders.put(`/api/performance/cycle/reminders/${made.id}`).send({ ...SELF, on: false }).expect(200);
    expect(await s.sender.run('2026-11-10')).toBe(0);
    await s.hr.post('/api/performance/cycle/close').expect(200);
    await s.reminders.put(`/api/performance/cycle/reminders/${made.id}`).send(SELF).expect(200);
    expect(await s.sender.run('2026-11-10')).toBe(0);
  });

  it('reminds the manager with an evaluation waiting every N days in the managers\' stage, and stops once they sent', async () => {
    const s = await setup();
    await s.reminders.post('/api/performance/cycle/reminders').send(MGR).expect(201);
    expect(await s.sender.run('2026-11-10')).toBe(0); // the self stage: the manager has nothing to do yet
    await s.hr.post('/api/performance/cycle/advance').expect(200); // mgr
    expect(await s.sender.run('2026-11-10')).toBe(1);
    expect(await s.titles(s.manager)).toContain('تقييم ينتظرك');
    expect(await s.sender.run('2026-11-11')).toBe(0); // 1 day later: every 2 days
    expect(await s.sender.run('2026-11-12')).toBe(1);
  });

  it('reminds the holder of the key of the stage: the calibration key holder in calibration, the approval key holder in approval, nobody in the other stages', async () => {
    const s = await setup();
    const calibrator = await t.factories.signIn(await t.factories.user({ grants: grants([CorePermission.PerformanceCalibrate]) }));
    const approver = await t.factories.signIn(await t.factories.user({ grants: grants([CorePermission.PerformanceApprove]) }));
    await s.reminders.post('/api/performance/cycle/reminders').send(APPR).expect(201);
    expect(await s.sender.run('2026-11-10')).toBe(0); // the self stage
    await s.hr.post('/api/performance/cycle/advance').expect(200);
    await s.hr.post('/api/performance/cycle/advance').expect(200); // cal
    expect(await s.sender.run('2026-11-10')).toBe(1);
    expect(await s.titles(calibrator)).toContain('معايرة واعتماد بانتظارك');
    expect(await s.titles(approver)).not.toContain('معايرة واعتماد بانتظارك');
    await s.hr.post('/api/performance/cycle/advance').expect(200); // appr
    expect(await s.sender.run('2026-11-12')).toBe(1);
    expect(await s.titles(approver)).toContain('معايرة واعتماد بانتظارك');
  });

  it('reminds the managers who have not recorded the minutes of a milestone, on its days before the date HR set, and stops once they recorded', async () => {
    const s = await setup();
    await s.reminders.post('/api/performance/cycle/reminders').send(MILE).expect(201);
    await s.hr.put('/api/performance/cycle/dates/pulse_sep').send({ from: '2026-09-15', to: null }).expect(200);
    expect(await s.sender.run('2026-09-09')).toBe(0); // 6 days before: not one of 5
    const minutes = { whereWeAre: '', obstacle: '', agreedAction: '', note: 'الأمور تسير جيدًا' };
    await s.manager.put(`/api/performance/team/${s.employeeUser.employeeId}/milestones/pulse_sep`).send(minutes).expect(200);
    expect(await s.sender.run('2026-09-10')).toBe(0); // 5 days before, but the minutes are recorded
    expect(await s.titles(s.manager)).not.toContain('محضر محطة ينتظرك');
    await t.db.query('DELETE FROM performance_milestones');
    expect(await s.sender.run('2026-09-10')).toBeGreaterThanOrEqual(1);
    expect(await s.titles(s.manager)).toContain('محضر محطة ينتظرك');
  });
});
