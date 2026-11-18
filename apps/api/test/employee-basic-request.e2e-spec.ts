import { CorePermission, type BasicRequestDto, type LookupsDto, type PermissionGrant } from '@arweqah-platform/shared';
import { describe, expect, it, vi } from 'vitest';
import { useTestApp } from './setup/test-app';

const P = CorePermission;
const grant = (key: string, scope: PermissionGrant['scope']): PermissionGrant => ({ key, scope });

describe('An employee asks to change their basic data and HR decides (FR-162)', () => {
  const t = useTestApp();

  async function setup() {
    const org = await t.factories.org();
    const me = await t.factories.user({ unit: org.unitA });
    const colleague = await t.factories.user({ unit: org.unitA });
    const hr = await t.factories.user({ unit: org.unitA, grants: [grant(P.EmployeesUpdate, 'all'), grant(P.EmployeesView, 'all'), grant(P.LookupsView, 'all')] });
    const [mine, hrAgent] = await Promise.all([t.factories.signIn(me), t.factories.signIn(hr)]);
    const lookups = (await hrAgent.get('/api/lookups').expect(200)).body as LookupsDto;
    const married = lookups.maritalStatuses.find((m) => m.code === 'married')!.id;
    const saudi = lookups.countries.find((c) => c.code === 'SA')!.id;
    return { org, me, colleague, hr, mine, hrAgent, married, saudi };
  }
  const titles = async (agent: Awaited<ReturnType<typeof setup>>['mine']) => ((await agent.get('/api/notifications').expect(200)).body.items as { titleAr: string }[]).map((n) => n.titleAr);

  it('sends one request, HR sees it and approves it: the record changes and the employee is told', async () => {
    const s = await setup();
    const sent = (await s.mine.put('/api/me/profile/basic-request').send({ fullName: 'اسم جديد', maritalStatusId: s.married, gender: 1 }).expect(200)).body as BasicRequestDto;
    expect(sent).toMatchObject({ status: 'pending', values: { fullName: 'اسم جديد', gender: 1 } });
    expect(((await s.mine.get('/api/me/profile/basic-request').expect(200)).body as BasicRequestDto).id).toBe(sent.id);
    await vi.waitFor(async () => expect(await titles(s.hrAgent)).toContain('طلب تعديل بيانات أساسية'));
    expect(((await s.hrAgent.get(`/api/employees/${s.me.employeeId}/basic-request`).expect(200)).body as BasicRequestDto).id).toBe(sent.id);
    await s.hrAgent.post(`/api/employees/${s.me.employeeId}/basic-request/approve`).expect(200);
    const record = (await s.hrAgent.get(`/api/employees/${s.me.employeeId}`).expect(200)).body;
    expect(record).toMatchObject({ fullName: 'اسم جديد', gender: 1 });
    expect(record.names.maritalStatus.nameEn).toBeTruthy();
    expect(await titles(s.mine)).toContain('اعتُمد طلب تعديل بياناتك');
    expect(((await s.mine.get('/api/me/profile/basic-request').expect(200)).body as BasicRequestDto).status).toBe('approved');
  });

  it('a rejection keeps the record, carries the optional reason, and lets the employee send a new request', async () => {
    const s = await setup();
    await s.mine.put('/api/me/profile/basic-request').send({ nationalityId: s.saudi }).expect(200);
    const before = (await s.hrAgent.get(`/api/employees/${s.me.employeeId}`).expect(200)).body;
    const rejected = (await s.hrAgent.post(`/api/employees/${s.me.employeeId}/basic-request/reject`).send({ reason: 'أرفق الهوية' }).expect(200)).body as BasicRequestDto;
    expect(rejected).toMatchObject({ status: 'rejected', rejectionReason: 'أرفق الهوية' });
    expect(((await s.hrAgent.get(`/api/employees/${s.me.employeeId}`).expect(200)).body as { nationalityId?: string }).nationalityId).toBe((before as { nationalityId?: string }).nationalityId);
    expect(await titles(s.mine)).toContain('رُفض طلب تعديل بياناتك');
    await s.mine.put('/api/me/profile/basic-request').send({ gender: 0, birthDate: '1990-05-01' }).expect(200);
  });

  it('validates: nothing to change, empty, future birth date, unknown option, a second pending request', async () => {
    const s = await setup();
    const record = (await s.mine.get(`/api/employees/${s.me.employeeId}`).expect(200)).body as { fullName: string };
    expect((await s.mine.put('/api/me/profile/basic-request').send({ fullName: record.fullName }).expect(422)).body.code).toBe('BASIC_REQUEST_NO_CHANGE');
    await s.mine.put('/api/me/profile/basic-request').send({}).expect(400);
    await s.mine.put('/api/me/profile/basic-request').send({ birthDate: '2999-01-01' }).expect(400);
    await s.mine.put('/api/me/profile/basic-request').send({ nationalityId: '11111111-1111-4111-8111-111111111111' }).expect(422);
    await s.mine.put('/api/me/profile/basic-request').send({ fullName: 'أول' }).expect(200);
    expect((await s.mine.put('/api/me/profile/basic-request').send({ fullName: 'ثان' }).expect(409)).body.code).toBe('BASIC_REQUEST_PENDING');
  });

  it('is cancelled while it waits, and then nobody can decide it', async () => {
    const s = await setup();
    await s.mine.put('/api/me/profile/basic-request').send({ fullName: 'سيُلغى' }).expect(200);
    await s.mine.delete('/api/me/profile/basic-request').expect(204);
    expect(((await s.mine.get('/api/me/profile/basic-request').expect(200)).body as BasicRequestDto).status).toBe('cancelled');
    await s.mine.delete('/api/me/profile/basic-request').expect(409);
    await s.hrAgent.post(`/api/employees/${s.me.employeeId}/basic-request/approve`).expect(409);
  });

  it('decided twice: the second decision is refused, the record is written once', async () => {
    const s = await setup();
    await s.mine.put('/api/me/profile/basic-request').send({ fullName: 'مرة واحدة' }).expect(200);
    const [a, b] = await Promise.all([s.hrAgent.post(`/api/employees/${s.me.employeeId}/basic-request/approve`), s.hrAgent.post(`/api/employees/${s.me.employeeId}/basic-request/reject`).send({})]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
  });

  it('403 without the key to ask; a plain colleague cannot see or decide (404); nobody decides their own request (422)', async () => {
    const s = await setup();
    const bare = await t.factories.user({ unit: s.org.unitA, without: ['profile.update_basic'] });
    await (await t.factories.signIn(bare)).put('/api/me/profile/basic-request').send({ fullName: 'x' }).expect(403);
    await s.mine.put('/api/me/profile/basic-request').send({ fullName: 'طلب' }).expect(200);
    const other = await t.factories.signIn(s.colleague);
    await other.get(`/api/employees/${s.me.employeeId}/basic-request`).expect(404);
    await other.post(`/api/employees/${s.me.employeeId}/basic-request/approve`).expect(404);
    expect((await s.mine.post(`/api/employees/${s.me.employeeId}/basic-request/approve`).expect(422)).body.code).toBe('BASIC_REQUEST_NOT_ALLOWED');
  });

  it('HR outside the employee\'s scope does not find the request (404)', async () => {
    const s = await setup();
    const unitB = await t.factories.user({ unit: s.org.unitB, grants: [grant(P.EmployeesUpdate, 'unit')] });
    await s.mine.put('/api/me/profile/basic-request').send({ fullName: 'خارج النطاق' }).expect(200);
    await (await t.factories.signIn(unitB)).post(`/api/employees/${s.me.employeeId}/basic-request/approve`).expect(404);
  });
});
