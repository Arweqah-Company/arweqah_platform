import { CorePermission, type OrgNodeLeadersDto, type OrgTreeDto, type PermissionGrant } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { todayInRiyadh } from '../src/common/domain/riyadh-date';
import { OrgLeadersService } from '../src/modules/org/application/services/org-leaders.service';
import { UserAccessService } from '../src/core/access/application/user-access.service';
import type { TestUser } from './factories/factories';
import { dayFromToday } from './helpers/hr-scenario';
import { ORG_ADMIN_GRANTS, orgAdmin, orgGrantsWithout } from './helpers/org-admin';
import { useTestApp } from './setup/test-app';

const ROLES_VIEW: PermissionGrant = { key: CorePermission.RolesView, scope: 'all' };

describe('Leaders per company and acting leaders (FR-100)', () => {
  const t = useTestApp();

  /** A sector managed per company (with a department under it that has people of two companies) and a shared sector with a department. */
  async function setup() {
    const group = await t.factories.defaultCompany();
    const companyB = await t.factories.company();
    const growth = await t.factories.node({ key: 'sector', parentId: null, name: 'Growth', mode: 'per_company' });
    const sales = await t.factories.node({ key: 'department', parentId: growth.id, name: 'Sales', titles: true });
    const ops = await t.factories.node({ key: 'sector', parentId: null, name: 'Ops', mode: 'shared' });
    const services = await t.factories.node({ key: 'department', parentId: ops.id, name: 'Services', titles: true });
    const { agent } = await orgAdmin(t, [...ORG_ADMIN_GRANTS, ROLES_VIEW]);
    const person = async (unit: { id: string; titleId: string; companyId: string }, company: string): Promise<TestUser> => {
      const user = await t.factories.user({ unit });
      await t.db.query('UPDATE employees SET company_id = $1 WHERE id = $2', [company, user.employeeId]);
      return user;
    };
    const leaders = async (nodeId: string): Promise<OrgNodeLeadersDto> => (await agent.get(`/api/org/nodes/${nodeId}/leaders`).expect(200)).body;
    const setLeader = (nodeId: string, body: Record<string, unknown>) => agent.put(`/api/org/nodes/${nodeId}/leaders`).send({ kind: 'leader', validFrom: todayInRiyadh(), reason: 'test', ...body });
    const headRole = async (nodeId: string) => ((await agent.get('/api/roles').expect(200)).body as { orgNodeId: string | null; usersCount: number; nameEn: string }[]).find((r) => r.orgNodeId === nodeId);
    const rolesOf = async (userId: string) => [...((await t.app.get(UserAccessService).rolesOf([userId])).get(userId) ?? [])].map((r) => r.id);
    const managerCopy = async (nodeId: string) => ((await t.db.query('SELECT manager_id FROM org_nodes WHERE id = $1', [nodeId])) as { manager_id: string | null }[])[0]?.manager_id;
    return { group, companyB, growth, sales, ops, services, agent, person, leaders, setLeader, headRole, rolesOf, managerCopy };
  }

  it('makes a person the leader of a unit managed per company for their company, keeps the unit\'s manager as a copy, and lists it with the people it leads', async () => {
    const s = await setup();
    const b1 = await s.person(s.sales, s.companyB);
    await s.person(s.sales, s.companyB);
    const res = await s.setLeader(s.sales.id, { companyId: s.companyB, employeeId: b1.employeeId }).expect(200);
    const dto = res.body as OrgNodeLeadersDto;
    expect(dto.effectiveMode).toBe('per_company');
    expect(dto.items).toHaveLength(1);
    expect(dto.items[0]).toMatchObject({ companyId: s.companyB, employeeId: b1.employeeId, kind: 'leader', status: 'current', reason: 'test' });
    const row = dto.companies.find((c) => c.companyId === s.companyB);
    expect(row).toMatchObject({ staffCount: 2, escalatesTo: null });
    expect(row?.leader?.employeeId).toBe(b1.employeeId);
    expect(await s.managerCopy(s.sales.id)).toBe(b1.employeeId);
    const tree = (await s.agent.get('/api/org/tree?view=full').expect(200)).body as OrgTreeDto;
    expect(tree.nodes.find((n) => n.id === s.sales.id)?.leaders).toEqual([expect.objectContaining({ employeeId: b1.employeeId, kind: 'leader', companyId: s.companyB })]);
  });

  it('requires the leader to belong to the company (422), the company to exist (404), and a shared unit to be led from the group company (422)', async () => {
    const s = await setup();
    const b1 = await s.person(s.sales, s.companyB);
    const a1 = await s.person(s.services, s.group);
    expect((await s.setLeader(s.sales.id, { companyId: s.group, employeeId: b1.employeeId }).expect(422)).body.code).toBe('ORG_LEADER_EMPLOYEE');
    await s.setLeader(s.sales.id, { companyId: '00000000-0000-4000-8000-000000000999', employeeId: b1.employeeId }).expect(404);
    expect((await s.setLeader(s.services.id, { companyId: s.companyB, employeeId: b1.employeeId }).expect(422)).body.code).toBe('ORG_LEADER_COMPANY');
    await s.setLeader(s.services.id, { companyId: s.group, employeeId: a1.employeeId }).expect(200);
    expect((await s.leaders(s.services.id)).effectiveMode).toBe('shared');
  });

  it('gives every leader and acting leader the one head role of the unit (not one per company) and takes it back when they are replaced', async () => {
    const s = await setup();
    const a1 = await s.person(s.sales, s.group);
    const b1 = await s.person(s.sales, s.companyB);
    const b2 = await s.person(s.sales, s.companyB);
    await s.setLeader(s.sales.id, { companyId: s.group, employeeId: a1.employeeId }).expect(200);
    await s.setLeader(s.sales.id, { companyId: s.companyB, employeeId: b1.employeeId }).expect(200);
    const role = await s.headRole(s.sales.id);
    expect(role).toMatchObject({ usersCount: 2 });
    expect(role?.nameEn).toMatch(/^Head of /);
    expect(await s.rolesOf(a1.id)).toHaveLength(2); // Employee + the head role
    await s.setLeader(s.sales.id, { companyId: s.companyB, employeeId: b2.employeeId }).expect(200); // same day: replaces b1
    expect((await s.headRole(s.sales.id))?.usersCount).toBe(2);
    const headRoleId = ((await s.agent.get('/api/roles').expect(200)).body as { id: string; orgNodeId: string | null }[]).find((r) => r.orgNodeId === s.sales.id)!.id;
    expect(await s.rolesOf(b1.id)).not.toContain(headRoleId);
    expect(await s.rolesOf(b2.id)).toContain(headRoleId);
    expect((await s.leaders(s.sales.id)).items.filter((i) => i.companyId === s.companyB)).toHaveLength(1);
    expect(await s.managerCopy(s.sales.id)).toBe(a1.employeeId); // the group company's leader is the primary one
  });

  it('a new leader starting later closes the one in force the day before; removing the waiting one gives the days back', async () => {
    const s = await setup();
    const b1 = await s.person(s.sales, s.companyB);
    const b2 = await s.person(s.sales, s.companyB);
    await s.setLeader(s.sales.id, { companyId: s.companyB, employeeId: b1.employeeId }).expect(200);
    const day = dayFromToday(5);
    const res = await s.setLeader(s.sales.id, { companyId: s.companyB, employeeId: b2.employeeId, validFrom: day }).expect(200);
    const items = (res.body as OrgNodeLeadersDto).items;
    expect(items.map((i) => [i.employeeId, i.status, i.validTo])).toEqual([[b2.employeeId, 'scheduled', null], [b1.employeeId, 'current', dayFromToday(4)]]);
    expect(await s.managerCopy(s.sales.id)).toBe(b1.employeeId);
    const waiting = items[0]!;
    const after = await s.agent.delete(`/api/org/nodes/${s.sales.id}/leaders/${waiting.id}`).expect(200);
    expect((after.body as OrgNodeLeadersDto).items.map((i) => [i.employeeId, i.validTo])).toEqual([[b1.employeeId, null]]);
  });

  it('removes only a leader that has not started (422), 404 for a row of another unit, and ends a leader in force on a day', async () => {
    const s = await setup();
    const b1 = await s.person(s.sales, s.companyB);
    const current = ((await s.setLeader(s.sales.id, { companyId: s.companyB, employeeId: b1.employeeId }).expect(200)).body as OrgNodeLeadersDto).items[0]!;
    expect((await s.agent.delete(`/api/org/nodes/${s.sales.id}/leaders/${current.id}`).expect(422)).body.code).toBe('ORG_LEADER_NOT_PENDING');
    await s.agent.delete(`/api/org/nodes/${s.growth.id}/leaders/${current.id}`).expect(404);
    expect((await s.agent.post(`/api/org/nodes/${s.sales.id}/leaders/${current.id}/end`).send({ endDate: dayFromToday(-1), reason: 'left' }).expect(422)).body.code).toBe('ORG_LEADER_END');
    const ended = await s.agent.post(`/api/org/nodes/${s.sales.id}/leaders/${current.id}/end`).send({ endDate: dayFromToday(7), reason: 'Leaves next week' }).expect(200);
    expect((ended.body as OrgNodeLeadersDto).items[0]).toMatchObject({ status: 'current', validTo: dayFromToday(7) });
  });

  it('an acting leader needs a leader and a window, holds the head role only inside it, and is never the leader', async () => {
    const s = await setup();
    const b1 = await s.person(s.sales, s.companyB);
    const b2 = await s.person(s.sales, s.companyB);
    const acting = { companyId: s.companyB, employeeId: b2.employeeId, kind: 'acting', validTo: dayFromToday(10) };
    expect((await s.setLeader(s.sales.id, acting).expect(422)).body.code).toBe('ORG_ACTING_NEEDS_LEADER');
    await s.setLeader(s.sales.id, { companyId: s.companyB, employeeId: b1.employeeId }).expect(200);
    expect((await s.setLeader(s.sales.id, { ...acting, validTo: null }).expect(422)).body.code).toBe('ORG_ACTING_WINDOW');
    expect((await s.setLeader(s.sales.id, { ...acting, employeeId: b1.employeeId }).expect(422)).body.code).toBe('ORG_ACTING_IS_LEADER');
    const later = await s.setLeader(s.sales.id, { ...acting, validFrom: dayFromToday(3) }).expect(200);
    expect((later.body as OrgNodeLeadersDto).items.find((i) => i.kind === 'acting')).toMatchObject({ status: 'scheduled' });
    expect(await s.rolesOf(b2.id)).toHaveLength(1); // not yet: only the Employee role
    expect((await s.setLeader(s.sales.id, { ...acting, validFrom: dayFromToday(5) }).expect(422)).body.code).toBe('ORG_ACTING_OVERLAP');
    await s.agent.delete(`/api/org/nodes/${s.sales.id}/leaders/${(later.body as OrgNodeLeadersDto).items.find((i) => i.kind === 'acting')!.id}`).expect(200);
    const now = await s.setLeader(s.sales.id, acting).expect(200);
    expect((now.body as OrgNodeLeadersDto).companies.find((c) => c.companyId === s.companyB)?.acting?.employeeId).toBe(b2.employeeId);
    expect(await s.rolesOf(b2.id)).toHaveLength(2);
    expect((await s.headRole(s.sales.id))?.usersCount).toBe(2);
  });

  it('refuses a start in the past (422) and a bad body (400)', async () => {
    const s = await setup();
    const b1 = await s.person(s.sales, s.companyB);
    expect((await s.setLeader(s.sales.id, { companyId: s.companyB, employeeId: b1.employeeId, validFrom: dayFromToday(-1) }).expect(422)).body.code).toBe('ORG_LEADER_IN_THE_PAST');
    await s.setLeader(s.sales.id, { companyId: s.companyB, employeeId: b1.employeeId, reason: '' }).expect(400);
    await s.setLeader(s.sales.id, { companyId: s.companyB, employeeId: b1.employeeId, validTo: dayFromToday(-3) }).expect(400);
    await s.setLeader(s.sales.id, { companyId: 'x', employeeId: b1.employeeId }).expect(400);
    await s.setLeader(s.sales.id, { companyId: s.companyB, employeeId: b1.employeeId, extra: 1 }).expect(400);
  });

  it('says where the manager goes when a company has employees in the unit and no leader there: the nearest unit above that has one for the company', async () => {
    const s = await setup();
    const b1 = await s.person(s.sales, s.companyB);
    const head = await s.person(s.sales, s.companyB);
    expect((await s.leaders(s.sales.id)).companies.find((c) => c.companyId === s.companyB)?.escalatesTo).toBeNull(); // nobody above leads for B either
    await s.setLeader(s.growth.id, { companyId: s.companyB, employeeId: head.employeeId }).expect(200);
    const row = (await s.leaders(s.sales.id)).companies.find((c) => c.companyId === s.companyB);
    expect(row?.leader).toBeNull();
    expect(row?.escalatesTo).toMatchObject({ nodeId: s.growth.id, employeeId: head.employeeId });
    await s.setLeader(s.sales.id, { companyId: s.companyB, employeeId: b1.employeeId }).expect(200);
    expect((await s.leaders(s.sales.id)).companies.find((c) => c.companyId === s.companyB)?.escalatesTo).toBeNull();
  });

  it('the nightly pass gives the head role and the current copy to a leader whose day came, and changes nothing the second time', async () => {
    const s = await setup();
    const b1 = await s.person(s.sales, s.companyB);
    await t.db.query(
      `INSERT INTO org_node_leaders (node_id, company_id, employee_id, kind, valid_from, reason) VALUES ($1, $2, $3, 'leader', $4, 'direct')`,
      [s.sales.id, s.companyB, b1.employeeId, todayInRiyadh()],
    );
    expect(await s.managerCopy(s.sales.id)).toBeNull();
    const service = t.app.get(OrgLeadersService);
    expect(await service.refreshCurrentCopies()).toBe(1);
    expect(await s.managerCopy(s.sales.id)).toBe(b1.employeeId);
    expect((await s.headRole(s.sales.id))?.usersCount).toBe(1);
    expect(await service.refreshCurrentCopies()).toBe(0);
  });

  it('403 without the leaders key, and a unit the person does not see is 404', async () => {
    const s = await setup();
    const b1 = await s.person(s.sales, s.companyB);
    const noKey = (await orgAdmin(t, orgGrantsWithout(CorePermission.OrgLeadersManage))).agent;
    await noKey.put(`/api/org/nodes/${s.sales.id}/leaders`).send({ companyId: s.companyB, employeeId: b1.employeeId, kind: 'leader', validFrom: todayInRiyadh(), reason: 'x' }).expect(403);
    const plain = await t.factories.signIn(await t.factories.user({ unit: s.sales }));
    await plain.get(`/api/org/nodes/${s.sales.id}/leaders`).expect(200);
    await plain.get(`/api/org/nodes/${s.services.id}/leaders`).expect(404);
    await plain.put(`/api/org/nodes/${s.sales.id}/leaders`).send({ companyId: s.companyB, employeeId: b1.employeeId, kind: 'leader', validFrom: todayInRiyadh(), reason: 'x' }).expect(403);
    await (await t.factories.signIn(await t.factories.user({ bare: true }))).get(`/api/org/nodes/${s.sales.id}/leaders`).expect(403);
  });
});
