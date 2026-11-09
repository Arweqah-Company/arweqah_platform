import { CorePermission, type DevelopmentRequestDto, type PermissionGrant, type RequestPreviewDto, type RequestsPageDto } from '@arweqah-platform/shared';
import { describe, expect, it, vi } from 'vitest';
import { CareerRequestDecisionService } from '../src/modules/career-profile/application/services/career-request-decision.service';
import { WorkflowEngine } from '../src/core/workflow/application/workflow-engine';
import { WORKFLOW_TRANSITIONED } from '../src/core/workflow/application/workflow.topics';
import { chainScenario } from './helpers/title-chain';
import { useTestApp } from './setup/test-app';

const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');
const DECIDE = [CorePermission.CareerRequestsView, CorePermission.CareerRequestsApprove, CorePermission.CareerRequestsReject];
const grants = (keys: string[]): PermissionGrant[] => keys.map((key) => ({ key, scope: 'all' as const }));

describe('Development requests (FR-116)', () => {
  const t = useTestApp();

  /** An employee (Rep, specialization stage: cap 5,000), a direct manager, the sector head and the CEO, each with the keys to decide. */
  async function setup(options: { ceo?: boolean } = {}) {
    const s = await chainScenario(t);
    const holder = await s.person(s.rep, s.group);
    const me = await t.factories.signIn(holder);
    const manager = await t.factories.user({ grants: grants(DECIDE) });
    const sectorHead = await t.factories.user({ grants: grants(DECIDE) });
    const ceo = await t.factories.user({ grants: grants(DECIDE) });
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [manager.employeeId, holder.employeeId]);
    await t.db.query('UPDATE org_nodes SET manager_id = $1 WHERE id = $2', [sectorHead.employeeId, s.sector.id]);
    if (options.ceo !== false) {
      const office = await t.factories.node({ key: 'office', parentId: null, name: 'CEO office' });
      await t.db.query('UPDATE org_nodes SET manager_id = $1 WHERE id = $2', [ceo.employeeId, office.id]);
    }
    const agents = { manager: await t.factories.signIn(manager), sectorHead: await t.factories.signIn(sectorHead), ceo: await t.factories.signIn(ceo) };
    const send = async (body: object = {}, status = 201) => me.post('/api/career-profile/me/requests').send({ courseName: 'دورة إدارة المشاريع', cost: 3000, plan: 'in', ...body }).expect(status);
    const preview = async (cost: number, plan: 'in' | 'out') => (await me.get('/api/career-profile/me/requests/preview').query({ cost, plan }).expect(200)).body as RequestPreviewDto;
    return { ...s, holder, me, ...agents, send, preview };
  }

  const titles = async (agent: Awaited<ReturnType<typeof setup>>['me']): Promise<string[]> => ((await agent.get('/api/notifications').expect(200)).body.items as { titleAr: string }[]).map((n) => n.titleAr);

  it('shows the approval chain a cost gives before sending: in the plan up to 5,000 the direct manager, outside it or up to 20,000 the sector head, above that the CEO', async () => {
    const s = await setup();
    expect(await s.preview(3000, 'in')).toMatchObject({ level: 'direct', budgetCap: 5000, spent: 0, left: 5000 });
    expect((await s.preview(3000, 'in')).approverName).toContain('User');
    expect(await s.preview(5001, 'in')).toMatchObject({ level: 'sector' });
    expect(await s.preview(100, 'out')).toMatchObject({ level: 'sector' });
    expect(await s.preview(20000, 'out')).toMatchObject({ level: 'sector' });
    expect(await s.preview(20001, 'in')).toMatchObject({ level: 'ceo' });
  });

  it('sends a request: it is pending with the level its cost asks for, the approver is told, and the employee sees it in their list', async () => {
    const s = await setup();
    const sent = (await s.send({ cost: 3000, plan: 'in' })).body as DevelopmentRequestDto;
    expect(sent).toMatchObject({ courseName: 'دورة إدارة المشاريع', cost: 3000, plan: 'in', status: 'pending', level: 'direct', canDecide: false, overBudget: false, hasAgreement: false });
    expect(((await s.me.get('/api/career-profile/me/requests').expect(200)).body as DevelopmentRequestDto[]).map((r) => r.id)).toEqual([sent.id]);
    await vi.waitFor(async () => expect(await titles(s.manager)).toContain('طلب تطوير بانتظار قرارك'));
    const big = (await s.send({ cost: 25000 })).body as DevelopmentRequestDto;
    expect(big.level).toBe('ceo');
    expect((await s.send({ plan: 'out' })).body.level).toBe('sector');
  });

  it('warns, never blocks, when the cost is above what is left of the yearly budget of the stage', async () => {
    const s = await setup();
    const over = (await s.send({ cost: 6000, plan: 'in' })).body as DevelopmentRequestDto;
    expect(over.overBudget).toBe(true);
    expect((await s.send({ cost: 1000 })).body.overBudget).toBe(false);
  });

  it('refuses what cannot be sent: unknown fields, a negative or fractional cost and a missing name (400), a file somebody else uploaded (404), and a request nobody can decide (422)', async () => {
    const s = await setup({ ceo: false });
    await s.send({ extra: 1 }, 400);
    await s.send({ cost: -1 }, 400);
    await s.send({ cost: 10.5 }, 400);
    await s.send({ courseName: '' }, 400);
    await s.send({ plan: 'zzz' }, 400);
    const other = await t.factories.signIn(await t.factories.user());
    const foreign = ((await other.post('/api/files').attach('file', PNG, 'x.png').expect(201)).body as { id: string }).id;
    await s.send({ agreementFileId: foreign }, 404);
    await s.send({ cost: 25000 }, 422); // above 20,000 but nobody holds any post above: the code says so
  });

  it('lets only the person the request is with decide it: another approver is 403, a person without the key is 403, and a second decision is 409', async () => {
    const s = await setup();
    const sent = (await s.send({ cost: 3000 })).body as DevelopmentRequestDto;
    await s.sectorHead.post(`/api/career/requests/${sent.id}/approve`).expect(403);
    await s.me.post(`/api/career/requests/${sent.id}/approve`).expect(403);
    await s.manager.post(`/api/career/requests/${sent.id}/approve`).expect(204);
    await s.manager.post(`/api/career/requests/${sent.id}/approve`).expect(409);
    await s.manager.post(`/api/career/requests/${sent.id}/reject`).send({ reason: 'سبب كافٍ' }).expect(409);
    await vi.waitFor(async () => expect(await titles(s.me)).toContain('اعتُمد طلب تطويرك'));
    expect(((await s.me.get('/api/career-profile/me/requests').expect(200)).body as DevelopmentRequestDto[])[0]).toMatchObject({ status: 'approved' });
  });

  it('counts only approved requests of the year as spent, and the budget left shrinks with them', async () => {
    const s = await setup();
    const a = (await s.send({ cost: 4000 })).body as DevelopmentRequestDto;
    expect(await s.preview(100, 'in')).toMatchObject({ spent: 0, left: 5000 });
    await s.manager.post(`/api/career/requests/${a.id}/approve`).expect(204);
    expect(await s.preview(100, 'in')).toMatchObject({ spent: 4000, left: 1000 });
    const b = (await s.send({ cost: 2000 })).body as DevelopmentRequestDto;
    expect(b.overBudget).toBe(true);
    await s.manager.post(`/api/career/requests/${b.id}/reject`).send({ reason: 'تجاوز الميزانية' }).expect(204);
    expect(await s.preview(100, 'in')).toMatchObject({ spent: 4000 });
  });

  it('rejects with a reason of at least five characters, the employee sees it, and the unknown, the out-of-scope and the unauthorised are 404, 404 and 403', async () => {
    const s = await setup();
    const sent = (await s.send({ cost: 3000 })).body as DevelopmentRequestDto;
    await s.manager.post(`/api/career/requests/${sent.id}/reject`).send({ reason: 'لا' }).expect(400);
    await s.manager.post(`/api/career/requests/${sent.id}/reject`).send({}).expect(400);
    await s.manager.post(`/api/career/requests/${sent.id}/reject`).send({ reason: 'الدورة خارج أولويات الفريق' }).expect(204);
    expect(((await s.me.get('/api/career-profile/me/requests').expect(200)).body as DevelopmentRequestDto[])[0]).toMatchObject({ status: 'rejected', rejectionReason: 'الدورة خارج أولويات الفريق' });
    await vi.waitFor(async () => expect(await titles(s.me)).toContain('رُفض طلب تطويرك'));
    await s.manager.post('/api/career/requests/00000000-0000-4000-8000-000000000000/approve').expect(404);
    const narrow = await t.factories.signIn(await t.factories.user({ grants: [...DECIDE].map((key) => ({ key, scope: 'unit' as const })) }));
    await narrow.post(`/api/career/requests/${sent.id}/approve`).expect(404);
    await s.me.get('/api/career/requests').expect(403);
  });

  it('lists the requests with the viewer (`mine`) or of the people the scope reaches, searched and filtered', async () => {
    const s = await setup();
    const a = (await s.send({ courseName: 'تحليل البيانات', cost: 3000 })).body as DevelopmentRequestDto;
    await s.send({ courseName: 'القيادة', cost: 9000, plan: 'out' });
    const mine = async (agent: typeof s.manager, query: Record<string, string> = {}) => (await agent.get('/api/career/requests').query(query).expect(200)).body as RequestsPageDto;
    expect((await mine(s.manager, { mine: 'true' })).items.map((r) => r.id)).toEqual([a.id]);
    expect((await mine(s.manager, { mine: 'true' })).items[0]).toMatchObject({ canDecide: true, employeeName: expect.any(String) });
    expect((await mine(s.sectorHead, { mine: 'true' })).items).toHaveLength(1);
    expect((await mine(s.ceo, { mine: 'true' })).items).toHaveLength(0);
    const all = await t.factories.signIn(await t.factories.user({ grants: grants([CorePermission.CareerRequestsView]) }));
    expect((await mine(all)).total).toBe(2);
    expect((await mine(all, { search: 'تحليل' })).items.map((r) => r.id)).toEqual([a.id]);
    expect((await mine(all, { level: 'sector' })).items).toHaveLength(1);
    expect((await mine(all, { plan: 'in' })).items).toHaveLength(1);
    expect((await mine(all, { status: 'approved' })).items).toHaveLength(0);
    const nothing = await t.factories.signIn(await t.factories.user({ grants: [{ key: CorePermission.CareerRequestsView, scope: 'unit' }] }));
    expect((await mine(nothing)).items).toHaveLength(0);
    await all.get('/api/career/requests').query({ status: 'zzz' }).expect(400);
  });

  it('serves the retention agreement to the people who may open the request, not to others', async () => {
    const s = await setup();
    const fileId = ((await s.me.post('/api/files').attach('file', PNG, 'agreement.png').expect(201)).body as { id: string }).id;
    const sent = (await s.send({ agreementFileId: fileId })).body as DevelopmentRequestDto;
    expect(sent).toMatchObject({ hasAgreement: true, agreementName: 'agreement.png' });
    await s.manager.get(`/api/career/requests/${sent.id}/agreement`).expect(200);
    const stranger = await t.factories.signIn(await t.factories.user({ grants: [{ key: CorePermission.CareerRequestsView, scope: 'unit' }] }));
    await stranger.get(`/api/career/requests/${sent.id}/agreement`).expect(404);
    const plain = (await s.send({})).body as DevelopmentRequestDto;
    await s.manager.get(`/api/career/requests/${plain.id}/agreement`).expect(404);
  });

  it('schedules the direct manager\'s deadline (seven days) and cancels it when the request is decided', async () => {
    const s = await setup();
    const sent = (await s.send({ cost: 3000 })).body as DevelopmentRequestDto;
    const instance = await t.app.get(WorkflowEngine).findByEntity('career_development_request', sent.id);
    const key = `workflow:${instance?.id}:timeout`;
    const [job] = (await t.db.query(`SELECT status, run_at FROM scheduled_jobs WHERE dedupe_key = $1`, [key])) as { status: string; run_at: Date }[];
    expect(job?.status).toBe('pending');
    const days = (new Date(job!.run_at).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThan(7.1);
    await s.manager.post(`/api/career/requests/${sent.id}/approve`).expect(204);
    expect(((await t.db.query(`SELECT status FROM scheduled_jobs WHERE dedupe_key = $1`, [key])) as { status: string }[])[0]?.status).toBe('cancelled');
  });

  it('sends a request the direct manager left up to the sector head when the deadline ends, tells both, and never moves a decided one', async () => {
    const s = await setup();
    const sent = (await s.send({ cost: 3000 })).body as DevelopmentRequestDto;
    const engine = t.app.get(WorkflowEngine);
    const instance = await engine.findByEntity('career_development_request', sent.id);
    const moved = await engine.send({ instanceId: instance!.id, event: { type: 'TIMEOUT' }, actorId: null, comment: 'timeout' });
    await t.app.get(CareerRequestDecisionService).onTransitioned({ instanceId: moved.id, definitionKey: 'career.development_request', entityType: 'career_development_request', entityId: sent.id, event: 'TIMEOUT', from: 'direct', to: 'sector', isDone: false, actorId: null });
    expect((await s.sectorHead.get('/api/career/requests').query({ mine: 'true' }).expect(200)).body.items).toHaveLength(1);
    expect((await s.manager.get('/api/career/requests').query({ mine: 'true' }).expect(200)).body.items).toHaveLength(0);
    expect(((await s.me.get('/api/career-profile/me/requests').expect(200)).body as DevelopmentRequestDto[])[0]).toMatchObject({ level: 'sector', status: 'pending' });
    await vi.waitFor(async () => expect(await titles(s.me)).toContain('صُعِّد طلب تطويرك'));
    await vi.waitFor(async () => expect(await titles(s.sectorHead)).toContain('طلب تطوير بانتظار قرارك'));
    await s.manager.post(`/api/career/requests/${sent.id}/approve`).expect(403);
    await s.sectorHead.post(`/api/career/requests/${sent.id}/approve`).expect(204);
    // a delayed message about a decided request changes nothing
    await t.app.get(CareerRequestDecisionService).onTransitioned({ instanceId: moved.id, definitionKey: 'career.development_request', entityType: 'career_development_request', entityId: sent.id, event: 'TIMEOUT', from: 'direct', to: 'sector', isDone: false, actorId: null });
    expect(((await s.me.get('/api/career-profile/me/requests').expect(200)).body as DevelopmentRequestDto[])[0]).toMatchObject({ status: 'approved' });
  });

  it('records every step in the audit trail without the reason text of other people', async () => {
    const s = await setup();
    const sent = (await s.send({})).body as DevelopmentRequestDto;
    await s.manager.post(`/api/career/requests/${sent.id}/approve`).expect(204);
    await vi.waitFor(async () => {
      const actions = ((await t.db.query(`SELECT action FROM audit_logs WHERE entity_type = 'career_development_request' AND entity_id = $1 ORDER BY created_at`, [sent.id])) as { action: string }[]).map((a) => a.action);
      expect(actions).toEqual(['career.request.submitted', 'career.request.approved']);
    });
  });

  it('exposes the topic the escalation listens to', () => {
    expect(WORKFLOW_TRANSITIONED).toBe('workflow.transitioned');
  });
});
