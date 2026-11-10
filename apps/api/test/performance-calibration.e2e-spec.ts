import { CorePermission, type CalibrationPageDto, type CalibrationRowDto, type CatalogItemDto, type SaveTeamEvaluationInput, type TeamEvaluationDto } from '@arweqah-platform/shared';
import { describe, expect, it, vi } from 'vitest';
import { evaluationScenario, grants } from './helpers/performance-keys';
import { useTestApp } from './setup/test-app';

const TEAM = [CorePermission.PerformanceTeamView, CorePermission.PerformanceTeamEvaluate];
const HOLDER = [CorePermission.PerformanceCalibrationView, CorePermission.PerformanceCalibrate];

describe('Calibration: the holder compares the managers\' scores and adjusts them by half points with a reason (FR-122)', () => {
  const t = useTestApp();

  /** The employee (Rep) reports to the direct manager (Lead); the manager has sent a complete evaluation; the cycle sits in the manager stage. */
  async function setup() {
    const { hr, ...s } = await evaluationScenario(t);
    const directUser = await s.person(s.lead, s.group, grants(TEAM));
    const employeeUser = await s.person(s.rep, s.group, grants([CorePermission.PerformanceSelfEvaluate]));
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [directUser.employeeId, employeeUser.employeeId]);
    const direct = await t.factories.signIn(directUser);
    const holder = await t.factories.signIn(await t.factories.user({ grants: grants(HOLDER) }));
    const viewer = await t.factories.signIn(await t.factories.user({ grants: grants([CorePermission.PerformanceCalibrationView]) }));
    const employee = await t.factories.signIn(employeeUser);
    const init = (await hr.post('/api/performance/cycle/catalog').send({ kind: 'init', title: 'قيادة مبادرة تحسين', points: 4 }).expect(201)).body as CatalogItemDto;
    await hr.post('/api/performance/cycle/open').send({ fiscalYear: 2026 }).expect(200);
    await hr.post('/api/performance/cycle/advance').expect(200); // mgr
    const path = `/api/performance/team/${employeeUser.employeeId}`;
    const dto = (await direct.get(path).expect(200)).body as TeamEvaluationDto;
    const form: SaveTeamEvaluationInput = {
      results: Object.fromEntries(dto.template.criteria.map((_, i) => [String(i), 80])),
      behaviours: Object.fromEntries(dto.template.behaviours.map((b) => [b.code, { level: 75, note: '' }])),
      initIds: [init.id], growthIds: [],
    };
    const sent = (await direct.post(`${path}/send`).send(form).expect(200)).body as TeamEvaluationDto;
    const toCalibration = () => hr.post('/api/performance/cycle/advance').expect(200);
    const mine = async (agent = holder) => ((await agent.get('/api/performance/calibration').expect(200)).body as CalibrationPageDto).items.find((r) => r.employeeId === employeeUser.employeeId)!;
    return { ...s, hr, holder, viewer, direct, employee, employeeUser, managerScore: sent.score!.final, toCalibration, mine, adjust: `/api/performance/calibration/${employeeUser.employeeId}` };
  }

  it('says there is no cycle before one is opened', async () => {
    const holder = await t.factories.signIn(await t.factories.user({ grants: grants(HOLDER) }));
    expect((await holder.get('/api/performance/calibration').expect(200)).body).toMatchObject({ cycle: null, items: [], total: 0 });
  });

  it('lists everyone with the manager score, the adjustment and the distribution; people without a sent evaluation wait', async () => {
    const s = await setup();
    await s.toCalibration();
    const page = (await s.holder.get('/api/performance/calibration').expect(200)).body as CalibrationPageDto;
    expect(page.cycle).toMatchObject({ fiscalYear: 2026, stage: 'cal' });
    expect(await s.mine()).toMatchObject({ managerScore: s.managerScore, adjustment: 0, calibrated: s.managerScore, reason: null });
    expect(page.waitingCount).toBeGreaterThan(0);
    expect(page.distribution.reduce((n, d) => n + d.count, 0)).toBe(page.total - page.waitingCount);
    const filtered = (await s.holder.get('/api/performance/calibration?adjusted=yes').expect(200)).body as CalibrationPageDto;
    expect(filtered.total).toBe(0);
    expect(((await s.holder.get('/api/performance/calibration?search=zzzzzz').expect(200)).body as CalibrationPageDto).total).toBe(0);
  });

  it('adjusts by half-point steps with a reason: the calibrated score moves, the audit is written, zero clears the reason', async () => {
    const s = await setup();
    await s.toCalibration();
    const row = (await s.holder.put(s.adjust).send({ adjustment: 1.5, reason: 'مقارنة بأقرانه في الوحدة' }).expect(200)).body as CalibrationRowDto;
    expect(row).toMatchObject({ adjustment: 1.5, reason: 'مقارنة بأقرانه في الوحدة', calibrated: Math.round((s.managerScore + 1.5) * 10) / 10, managerScore: s.managerScore });
    expect(await s.mine()).toMatchObject({ adjustment: 1.5 });
    expect(((await s.holder.get('/api/performance/calibration?adjusted=yes').expect(200)).body as CalibrationPageDto).total).toBe(1);
    await vi.waitFor(async () => expect(await t.db.query(`SELECT 1 FROM audit_logs WHERE action = 'performance.calibration.adjusted'`)).toHaveLength(1));
    expect(await s.holder.put(s.adjust).send({ adjustment: 0 }).expect(200)).toBeTruthy();
    expect(await s.mine()).toMatchObject({ adjustment: 0, reason: null, calibrated: s.managerScore });
  });

  it('refuses a bad adjustment (422 / 400): no reason, off the half-point step, beyond ±10', async () => {
    const s = await setup();
    await s.toCalibration();
    await s.holder.put(s.adjust).send({ adjustment: 1 }).expect(400);
    await s.holder.put(s.adjust).send({ adjustment: 1, reason: 'قصير' }).expect(400);
    await s.holder.put(s.adjust).send({ adjustment: 0.3, reason: 'سبب مكتوب كافٍ' }).expect(400);
    await s.holder.put(s.adjust).send({ adjustment: 10.5, reason: 'سبب مكتوب كافٍ' }).expect(400);
    await s.holder.put(s.adjust).send({ adjustment: -10, reason: 'سبب مكتوب كافٍ', extra: 1 }).expect(400);
    expect(await s.mine()).toMatchObject({ adjustment: 0 });
  });

  it('never takes the calibrated score below 0', async () => {
    const s = await setup();
    await s.toCalibration();
    const row = (await s.holder.put(s.adjust).send({ adjustment: -10, reason: 'سبب مكتوب كافٍ' }).expect(200)).body as CalibrationRowDto;
    expect(row.calibrated).toBe(Math.max(0, Math.round((s.managerScore - 10) * 10) / 10));
  });

  it('answers 409 outside the calibration stage (CALIBRATION_NOT_OPEN) and for a person whose managers have not sent (CALIBRATION_WAITING)', async () => {
    const s = await setup();
    expect((await s.holder.put(s.adjust).send({ adjustment: 0.5, reason: 'سبب مكتوب كافٍ' }).expect(409)).body).toMatchObject({ code: 'CALIBRATION_NOT_OPEN' });
    expect((await s.holder.post('/api/performance/calibration/finish').expect(409)).body).toMatchObject({ code: 'CALIBRATION_NOT_OPEN' });
    await s.toCalibration();
    const [other] = ((await t.db.query(`SELECT employee_id FROM performance_evaluations WHERE employee_id <> $1 LIMIT 1`, [s.employeeUser.employeeId])) as { employee_id: string }[]) as [{ employee_id: string }];
    expect((await s.holder.put(`/api/performance/calibration/${other.employee_id}`).send({ adjustment: 0.5, reason: 'سبب مكتوب كافٍ' }).expect(409)).body).toMatchObject({ code: 'CALIBRATION_WAITING' });
    await s.holder.put('/api/performance/calibration/33333333-3333-4333-8333-333333333333').send({ adjustment: 0 }).expect(404);
  });

  it('finishes calibration only when everyone has a sent manager score, and moves the cycle to approval', async () => {
    const s = await setup();
    await s.toCalibration();
    expect((await s.holder.post('/api/performance/calibration/finish').expect(409)).body).toMatchObject({ code: 'CALIBRATION_WAITING', details: { waiting: expect.any(Number) } });
    await t.db.query('DELETE FROM performance_evaluations WHERE employee_id <> $1', [s.employeeUser.employeeId]);
    await s.holder.post('/api/performance/calibration/finish').expect(204);
    expect(((await s.holder.get('/api/performance/calibration').expect(200)).body as CalibrationPageDto).cycle).toMatchObject({ stage: 'appr' });
    expect((await s.holder.put(s.adjust).send({ adjustment: 0.5, reason: 'سبب مكتوب كافٍ' }).expect(409)).body).toMatchObject({ code: 'CALIBRATION_NOT_OPEN' });
  });

  it('answers 403 to everyone without the keys: the employee, the manager, and the viewer who cannot adjust', async () => {
    const s = await setup();
    await s.toCalibration();
    for (const agent of [s.employee, s.direct]) await agent.get('/api/performance/calibration').expect(403);
    await s.viewer.get('/api/performance/calibration').expect(200);
    await s.viewer.put(s.adjust).send({ adjustment: 0.5, reason: 'سبب مكتوب كافٍ' }).expect(403);
    await s.viewer.post('/api/performance/calibration/finish').expect(403);
    await s.hr.get('/api/performance/calibration').expect(403);
  });
});
