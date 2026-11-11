import { CorePermission, type CalibrationPageDto, type CatalogItemDto, type CycleStateDto, type MyCareerProfileDto, type MyEvaluationDto, type ObjectionListDto, type TeamEvaluationDto, type TitleFileResultDto } from '@arweqah-platform/shared';
import { describe, expect, it, vi } from 'vitest';
import { SAMPLE_TITLE_FILE } from '../src/modules/career-profile/domain/rules/fixtures/title-file.sample';
import { PerformanceReminderSendService } from '../src/modules/performance/application/services/performance-reminder-send.service';
import { evaluationScenario, grants } from './helpers/performance-keys';
import { useTestApp } from './setup/test-app';

const CAREER_HR = [CorePermission.CareerContentView, CorePermission.CareerContentEdit, CorePermission.CareerTitlefileUpload, CorePermission.CareerTitlefilePublish, CorePermission.CareerAcknowledgeReopen];
const TEAM = [CorePermission.PerformanceTeamView, CorePermission.PerformanceTeamEvaluate, CorePermission.PerformanceMilestoneView, CorePermission.PerformanceMilestoneRecord];
const OWN = [CorePermission.PerformanceSelfEvaluate, CorePermission.PerformanceObject, CorePermission.PerformanceExport, CorePermission.PerformanceMilestoneAck];
const HOLDER = [CorePermission.PerformanceCalibrationView, CorePermission.PerformanceCalibrate, CorePermission.PerformanceApprove];

/** One whole year of the career profile: the title file, the acknowledgement, then the evaluation cycle from opening to closing. */
describe('Career profile to the end of an evaluation cycle (journey)', () => {
  const t = useTestApp();

  it('runs the whole path: file -> ready -> acknowledged -> cycle -> self -> manager -> calibration -> approval -> result -> objection -> close', async () => {
    const { hr, ...s } = await evaluationScenario(t);
    const careerHr = await t.factories.signIn(await t.factories.user({ grants: grants(CAREER_HR) }));
    const directUser = await s.person(s.lead, s.group, grants(TEAM));
    const upperUser = await s.person(s.head, s.group, grants(TEAM));
    const employeeUser = await s.person(s.rep, s.group, grants(OWN));
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [directUser.employeeId, employeeUser.employeeId]);
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [upperUser.employeeId, directUser.employeeId]);
    const [direct, employee, upper] = [await t.factories.signIn(directUser), await t.factories.signIn(employeeUser), await t.factories.signIn(upperUser)];
    const reminders = await t.factories.signIn(await t.factories.user({ grants: grants([CorePermission.PerformanceRemindersManage]) }));
    const titles = async (agent: typeof employee) => ((await agent.get('/api/notifications').expect(200)).body.items as { titleAr: string }[]).map((n) => n.titleAr);
    const holder = await t.factories.signIn(await t.factories.user({ grants: grants(HOLDER) }));
    const mine = async () => (await employee.get('/api/career-profile/me').expect(200)).body as MyCareerProfileDto;

    // 1. HR adds the career file of the title (a dry run first, then saved), and sets it ready
    const file = SAMPLE_TITLE_FILE.replaceAll('OPS.01.01.01-L9P-01', s.rep.code as string);
    const url = `/api/career/titles/${s.rep.id}`;
    expect(((await careerHr.post(`${url}/file`).send({ text: file }).expect(200)).body as TitleFileResultDto)).toMatchObject({ saved: false, problems: [] });
    expect(((await careerHr.post(`${url}/file`).send({ text: file, dryRun: false }).expect(200)).body as TitleFileResultDto)).toMatchObject({ saved: true, version: 1 });
    expect(await mine()).toMatchObject({ available: false, ackRequired: false }); // still a draft
    await careerHr.post(`${url}/publish`).expect(200);

    // 2. the employee is held back until they acknowledge that they read it
    expect(await mine()).toMatchObject({ available: true, ackRequired: true, ackReason: 'first', contentVersion: 1 });
    await employee.post('/api/career-profile/me/acknowledge').send({ contentVersion: 1 }).expect(200);
    expect(await mine()).toMatchObject({ ackRequired: false, acknowledgedVersion: 1 });

    // 3. HR opens the cycle; the employee gets an empty self form
    const init = (await hr.post('/api/performance/cycle/catalog').send({ kind: 'init', title: 'قيادة مبادرة تحسين', points: 4 }).expect(201)).body as CatalogItemDto;
    await hr.post('/api/performance/cycle/open').send({ fiscalYear: 2026 }).expect(200);
    const my = async () => (await employee.get('/api/performance/me').expect(200)).body as MyEvaluationDto;
    expect((await my()).evaluation).toMatchObject({ editable: true, self: { sentAt: null } });
    const notices = (await employee.get('/api/performance/me/notices').expect(200)).body as { items?: unknown[] } | unknown[];
    expect(JSON.stringify(notices)).toContain('self');

    // 3b. the automatic reminder reaches the employee who has not sent, once a day
    await hr.put('/api/performance/cycle/dates/self_deadline').send({ from: '2026-11-17', to: null }).expect(200);
    await reminders.post('/api/performance/cycle/reminders').send({ kind: 'self', on: true, days: [7], titleAr: 'تذكير بتقييمك الذاتي', titleEn: '', bodyAr: 'اقترب آخر موعد للتقييم الذاتي', bodyEn: '' }).expect(201);
    const sender = t.app.get(PerformanceReminderSendService);
    expect(await sender.run('2026-11-10')).toBeGreaterThanOrEqual(1);
    expect(await titles(employee)).toContain('تذكير بتقييمك الذاتي');
    expect(await sender.run('2026-11-10')).toBe(0);

    // 3c. milestone: the manager records the minutes, the employee reads and acknowledges
    const mile = `/api/performance/team/${employeeUser.employeeId}/milestones`;
    await direct.put(`${mile}/review_jul`).send({ whereWeAre: 'نسير وفق الخطة', obstacle: 'ضيق الوقت', agreedAction: 'مراجعة الأولويات أسبوعيًا', note: '' }).expect(200);
    await employee.post('/api/performance/me/milestones/review_jul/acknowledge').expect(200);

    // 4. self evaluation: draft, then sent; the manager is told
    const tpl = (await my()).evaluation!.template;
    const self = {
      behaviours: Object.fromEntries(tpl.behaviours.map((b) => [b.code, { level: 75, note: '' }])),
      achievements: Object.fromEntries(tpl.criteria.map((_, i) => [String(i), 'أنجزت المطلوب'])),
      initIds: [init.id], growthIds: [] as string[],
    };
    await employee.put('/api/performance/me/self').send(self).expect(200);
    await employee.post('/api/performance/me/self/send').send(self).expect(200);
    expect((await my()).evaluation!.self.sentAt).not.toBeNull();
    await sender.run('2026-11-16'); // the day before the deadline: nothing for someone who sent
    expect((await titles(employee)).filter((x) => x === 'تذكير بتقييمك الذاتي')).toHaveLength(1);

    // 5. manager stage: the direct manager writes and sends
    await hr.post('/api/performance/cycle/advance').expect(200);
    const path = `/api/performance/team/${employeeUser.employeeId}`;
    const team = (await direct.get(path).expect(200)).body as TeamEvaluationDto;
    const form = {
      results: Object.fromEntries(team.template.criteria.map((_, i) => [String(i), 85])),
      behaviours: Object.fromEntries(team.template.behaviours.map((b) => [b.code, { level: 75, note: '' }])),
      initIds: [init.id], growthIds: [] as string[],
    };
    const sent = (await direct.post(`${path}/send`).send(form).expect(200)).body as TeamEvaluationDto;
    expect(sent.score!.final).toBeGreaterThan(0);
    expect((await my()).evaluation!.editable).toBe(false); // the employee can no longer edit once the manager started
    // 5b. the upper manager reviews after the direct one and sees both copies
    await upper.post(`${path}/send`).send(form).expect(200);
    await vi.waitFor(async () => expect(await titles(upper)).toContain('تقييم بانتظار مراجعتك')); // told when the direct manager sent
    await vi.waitFor(async () => expect(await titles(direct)).toContain('تقييم ذاتي بانتظار مراجعتك'));

    // 6. calibration: only the employee stays in the list; adjust, finish, approve
    await hr.post('/api/performance/cycle/advance').expect(200);
    await t.db.query('DELETE FROM performance_evaluations WHERE employee_id <> $1', [employeeUser.employeeId]);
    expect((await employee.get('/api/performance/me').expect(200)).body.result ?? null).toBeNull();
    await holder.put(`/api/performance/calibration/${employeeUser.employeeId}`).send({ adjustment: 1, reason: 'مقارنة بأقرانه في الوحدة' }).expect(200);
    await holder.post('/api/performance/calibration/finish').expect(204);
    await holder.post('/api/performance/calibration/approve').expect(204);
    expect(((await holder.get('/api/performance/calibration').expect(200)).body as CalibrationPageDto).cycle).toMatchObject({ stage: 'notif' });

    // 7. the employee sees the frozen result, objects once; the cycle cannot close while it is open
    const result = (await my()).result!;
    expect(result.finalScore).toBe(Math.round((sent.score!.final + 1) * 10) / 10);
    expect(result).toMatchObject({ canObject: true });
    const objection = { itemKind: 'criterion', itemRef: '0', reason: 'أرى أن إنجازي في هذا المعيار أعلى' };
    await employee.post('/api/performance/me/objection').send(objection).expect(200);
    expect((await hr.post('/api/performance/cycle/close').expect(409)).body).toMatchObject({ code: 'OBJECTION_PENDING' });

    // 8. accepted: the manager re-sends higher, the holder finalises, the result rises
    const [row] = ((await holder.get('/api/performance/objections').expect(200)).body as ObjectionListDto).items;
    await holder.post(`/api/performance/objections/${row!.id}/return`).expect(204);
    const revised = { ...form, results: Object.fromEntries(Object.keys(form.results).map((k) => [k, 100])) };
    const resent = (await direct.post(`${path}/send`).send(revised).expect(200)).body as TeamEvaluationDto;
    await holder.post(`/api/performance/objections/${row!.id}/finalize`).expect(409); // the upper manager has not re-sent (decision 352)
    await upper.post(`${path}/send`).send(revised).expect(200);
    await holder.post(`/api/performance/objections/${row!.id}/finalize`).expect(204);
    // the +1 calibration was dropped when the objection was accepted (decision 371): the result is the revised score alone
    expect((await my()).result!.finalScore).toBe(resent.score!.final);
    expect((await my()).result!.breakdown).toMatchObject({ adjustment: 0 });
    expect((await my()).result!.finalScore).toBeGreaterThan(result.finalScore);

    // 9. close the cycle
    await hr.post('/api/performance/cycle/close').expect(200);
    expect(((await hr.get('/api/performance/cycle').expect(200)).body as CycleStateDto).cycle).toMatchObject({ stage: 'closed' });
    await vi.waitFor(async () => expect(await t.db.query(`SELECT 1 FROM audit_logs WHERE action = 'performance.results.approved'`)).toHaveLength(1));
  });
});
