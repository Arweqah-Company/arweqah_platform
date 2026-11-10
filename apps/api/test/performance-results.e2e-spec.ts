import { CorePermission, addWorkingDays, riyadhToday, type CalibrationPageDto, type MyEvaluationDto, type TeamEvaluationDto, type ObjectionListDto } from '@arweqah-platform/shared';
import { describe, expect, it, vi } from 'vitest';
import { grants, managerSentScenario } from './helpers/performance-keys';
import { useTestApp } from './setup/test-app';

const HOLDER = [CorePermission.PerformanceCalibrationView, CorePermission.PerformanceCalibrate, CorePermission.PerformanceApprove];
const OWN = [CorePermission.PerformanceSelfEvaluate, CorePermission.PerformanceObject, CorePermission.PerformanceExport];

describe('Approval, the individual result and the objection (FR-122, FR-123)', () => {
  const t = useTestApp();

  /** The employee (Rep) reports to the direct manager (Lead) who sent a complete evaluation; the cycle is in calibration and Rep is the only one in it. */
  async function setup() {
    const { hr, ...s } = await managerSentScenario(t, OWN);
    const holder = await t.factories.signIn(await t.factories.user({ grants: grants(HOLDER) }));
    await hr.post('/api/performance/cycle/advance').expect(200); // cal
    await t.db.query('DELETE FROM performance_evaluations WHERE employee_id <> $1', [s.employeeUser.employeeId]);
    const toApproval = () => holder.post('/api/performance/calibration/finish').expect(204);
    const approve = async () => { await toApproval(); await holder.post('/api/performance/calibration/approve').expect(204); };
    const me = async () => (await s.employee.get('/api/performance/me').expect(200)).body as MyEvaluationDto;
    const objection = { itemKind: 'criterion', itemRef: '0', reason: 'أرى أن إنجازي في هذا المعيار أعلى' };
    return { ...s, hr, holder, toApproval, approve, me, objection };
  }

  it('hides the score from the employee until the approval: the answer has no result, not even when the manager has sent', async () => {
    const s = await setup();
    expect((await s.me()).result ?? null).toBeNull();
    expect(JSON.stringify(await s.me())).not.toContain('finalScore');
    await s.toApproval();
    expect((await s.me()).result ?? null).toBeNull();
    await s.employee.post('/api/performance/me/objection').send(s.objection).expect(409);
  });

  it('approves: freezes the result with the calibration, tells everyone, moves to the notification stage, and the employee sees it', async () => {
    const s = await setup();
    await s.holder.put(`/api/performance/calibration/${s.employeeUser.employeeId}`).send({ adjustment: 1, reason: 'مقارنة بأقرانه في الوحدة' }).expect(200);
    await s.approve();
    const result = (await s.me()).result!;
    expect(result).toMatchObject({ finalScore: Math.round((s.managerScore + 1) * 10) / 10, canObject: true, objection: null, objectionUntil: addWorkingDays(riyadhToday(), 5) });
    expect(result.breakdown).toMatchObject({ managerScore: s.managerScore, adjustment: 1, reason: 'مقارنة بأقرانه في الوحدة' });
    expect(result.levelName).toEqual(expect.any(String));
    expect(((await s.holder.get('/api/performance/calibration').expect(200)).body as CalibrationPageDto).cycle).toMatchObject({ stage: 'notif' });
    await vi.waitFor(async () => expect(await t.db.query(`SELECT 1 FROM audit_logs WHERE action = 'performance.results.approved'`)).toHaveLength(1));
    await s.holder.post('/api/performance/calibration/approve').expect(409); // not in approval any more
  });

  it('refuses to approve outside the approval stage, and to anyone without the approval key', async () => {
    const s = await setup();
    expect((await s.holder.post('/api/performance/calibration/approve').expect(409)).body).toMatchObject({ code: 'APPROVAL_NOT_OPEN' });
    await s.toApproval();
    await s.employee.post('/api/performance/calibration/approve').expect(403);
    const calibrateOnly = await t.factories.signIn(await t.factories.user({ grants: grants([CorePermission.PerformanceCalibrate]) }));
    await calibrateOnly.post('/api/performance/calibration/approve').expect(403);
  });

  it('takes one objection per employee, inside the window: validation, the item must exist, a second one is refused', async () => {
    const s = await setup();
    await s.approve();
    await s.employee.post('/api/performance/me/objection').send({ ...s.objection, reason: 'قصير' }).expect(400);
    await s.employee.post('/api/performance/me/objection').send({ ...s.objection, itemRef: '99' }).expect(422);
    await s.employee.post('/api/performance/me/objection').send({ itemKind: 'behaviour', itemRef: 'X9.9', reason: 'سبب مكتوب كافٍ للاعتراض' }).expect(422);
    const raised = (await s.employee.post('/api/performance/me/objection').send(s.objection).expect(200)).body;
    expect(raised.objection).toMatchObject({ status: 'open', itemKind: 'criterion', itemRef: '0' });
    expect(raised.canObject).toBe(false);
    expect((await s.employee.post('/api/performance/me/objection').send(s.objection).expect(409)).body).toMatchObject({ code: 'OBJECTION_EXISTS' });
  });

  it('blocks closing the cycle while an objection is open (409 OBJECTION_PENDING)', async () => {
    const s = await setup();
    await s.approve();
    await s.employee.post('/api/performance/me/objection').send(s.objection).expect(200);
    expect((await s.hr.post('/api/performance/cycle/close').expect(409)).body).toMatchObject({ code: 'OBJECTION_PENDING' });
  });

  it('refuses an objection once the five working days have passed (409 OBJECTION_WINDOW_CLOSED)', async () => {
    const s = await setup();
    await s.approve();
    await t.db.query(`UPDATE performance_results SET objection_until = '2000-01-01'`);
    expect((await s.me()).result).toMatchObject({ canObject: false });
    expect((await s.employee.post('/api/performance/me/objection').send(s.objection).expect(409)).body).toMatchObject({ code: 'OBJECTION_WINDOW_CLOSED' });
  });

  it('rejects an objection with a written reason; the employee sees it and the cycle can be closed', async () => {
    const s = await setup();
    await s.approve();
    await s.employee.post('/api/performance/me/objection').send(s.objection).expect(200);
    const [row] = ((await s.holder.get('/api/performance/objections').expect(200)).body as ObjectionListDto).items;
    expect(row).toMatchObject({ status: 'open', employeeId: s.employeeUser.employeeId });
    await s.holder.post(`/api/performance/objections/${row!.id}/reject`).send({ reason: 'قصير' }).expect(400);
    await s.holder.post(`/api/performance/objections/${row!.id}/reject`).send({ reason: 'التقييم موثّق ببيانات المعيار' }).expect(204);
    expect((await s.me()).result!.objection).toMatchObject({ status: 'rejected', decisionReason: 'التقييم موثّق ببيانات المعيار' });
    await s.holder.post(`/api/performance/objections/${row!.id}/reject`).send({ reason: 'التقييم موثّق ببيانات المعيار' }).expect(409);
    await s.hr.post('/api/performance/cycle/close').expect(200);
  });

  it('accepts an objection: the manager can write again in any stage, then the holder approves the revised evaluation and the result changes', async () => {
    const s = await setup();
    await s.approve();
    await s.employee.post('/api/performance/me/objection').send(s.objection).expect(200);
    const [row] = ((await s.holder.get('/api/performance/objections').expect(200)).body as ObjectionListDto).items;
    await s.holder.post(`/api/performance/objections/${row!.id}/finalize`).expect(409); // the manager has not re-sent
    await s.direct.put(s.path).send(s.form).expect(409); // closed to the manager until the objection is accepted
    await s.holder.post(`/api/performance/objections/${row!.id}/return`).expect(204);
    expect((await s.me()).result!.objection).toMatchObject({ status: 'returned' });
    const before = (await s.me()).result!.finalScore;
    const revised = { ...s.form, results: Object.fromEntries(Object.keys(s.form.results).map((k) => [k, 100])) };
    const sent = (await s.direct.post(`${s.path}/send`).send(revised).expect(200)).body as TeamEvaluationDto;
    expect((await s.hr.post('/api/performance/cycle/close').expect(409)).body).toMatchObject({ code: 'OBJECTION_PENDING' });
    await s.holder.post(`/api/performance/objections/${row!.id}/finalize`).expect(204);
    const after = (await s.me()).result!;
    expect(after.finalScore).toBe(sent.score!.final);
    expect(after.finalScore).toBeGreaterThan(before);
    expect(after.objection).toMatchObject({ status: 'finalized' });
    await s.hr.post('/api/performance/cycle/close').expect(200);
  });

  it('answers 403 and 404 for the objection screens: no key, wrong id, a decision on a missing objection', async () => {
    const s = await setup();
    await s.approve();
    await s.employee.get('/api/performance/objections').expect(403);
    await s.employee.post('/api/performance/objections/33333333-3333-4333-8333-333333333333/return').expect(403);
    await s.holder.post('/api/performance/objections/33333333-3333-4333-8333-333333333333/return').expect(404);
    const stranger = await t.factories.signIn(await t.factories.user({ grants: grants([CorePermission.PerformanceObject]) }));
    await stranger.post('/api/performance/me/objection').send(s.objection).expect(404); // holds the key but has no evaluation in the cycle
  });

  it('tells the holders of the approval key when an objection is raised', async () => {
    const s = await setup();
    await s.approve();
    await s.employee.post('/api/performance/me/objection').send(s.objection).expect(200);
    await vi.waitFor(async () => expect(((await s.holder.get('/api/notifications').expect(200)).body.items as { titleAr: string }[]).map((n) => n.titleAr)).toContain('اعتراض جديد على نتيجة تقييم'));
  });

  it('after an accepted objection the direct manager sends again and then the upper manager reviews again; the approval waits for both (409 OBJECTION_STATE)', async () => {
    const s = await setup();
    const upperUser = await s.person(s.head, s.group, grants([CorePermission.PerformanceTeamView, CorePermission.PerformanceTeamEvaluate]));
    const upper = await t.factories.signIn(upperUser);
    const [direct] = (await t.db.query('SELECT manager_id FROM employees WHERE id = $1', [s.employeeUser.employeeId])) as { manager_id: string }[];
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [upperUser.employeeId, direct!.manager_id]);
    await t.db.query(`INSERT INTO performance_manager_reviews (evaluation_id, level, reviewer_user_id, content, sent_at) SELECT evaluation_id, 'upper', $1, content, now() FROM performance_manager_reviews WHERE level = 'direct'`, [upperUser.id]);
    await s.approve();
    await s.employee.post('/api/performance/me/objection').send(s.objection).expect(200);
    const [row] = ((await s.holder.get('/api/performance/objections').expect(200)).body as ObjectionListDto).items;
    await s.holder.post(`/api/performance/objections/${row!.id}/return`).expect(204);
    expect((await t.db.query(`SELECT sent_at FROM performance_manager_reviews`) as { sent_at: unknown }[]).every((r) => r.sent_at === null)).toBe(true); // both copies are drafts again
    expect((await upper.put(s.path).send(s.form).expect(409)).body).toMatchObject({ code: 'EVALUATION_BLOCKED', details: { block: 'wait_direct' } }); // the direct manager goes first
    await s.direct.post(`${s.path}/send`).send(s.form).expect(200);
    await s.holder.post(`/api/performance/objections/${row!.id}/finalize`).expect(409); // the upper manager has not sent again
    await upper.post(`${s.path}/send`).send(s.form).expect(200);
    await s.holder.post(`/api/performance/objections/${row!.id}/finalize`).expect(204);
  });
});
