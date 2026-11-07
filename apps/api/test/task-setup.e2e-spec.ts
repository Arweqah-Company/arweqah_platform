import { CorePermission as P, TASK_POLICY_DEFAULTS, TASK_POLICY_LIMITS, type TaskPolicyDto, type TaskTagAdminDto, type TaskDepartmentOptionDto } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import type { TestAgent } from './factories/factories';
import { ADMIN_MODE_GRANT } from './factories/factories';
import { TASK_EMPLOYEE_GRANTS, taskManagerGrants } from './factories/task-grants';
import { useTestApp } from './setup/test-app';

const TAG_KEYS = [P.TasksTagsView, P.TasksTagCreate, P.TasksTagUpdate, P.TasksTagDelete];
const tagGrants = (scope: 'own' | 'unit' | 'subtree' | 'company' | 'all') => TAG_KEYS.map((key) => ({ key, scope }));
const POLICY = { objectionWorkingDays: 5, staleDays: 45, backdateDays: 3, urgentDays: 1, reminderDaysBefore: 2, digestWeekday: 1, standaloneRetentionDays: 60, commentMaxFiles: 3, commentEditMinutes: 30, commentLockDays: 14 };

describe('Tasks: tags and policies (FR-54)', () => {
  const t = useTestApp();

  async function world() {
    const org = await t.factories.org();
    const deptManager = await t.factories.user({ unit: org.unitA, grants: [...TASK_EMPLOYEE_GRANTS, ...tagGrants('own')] });
    const otherManager = await t.factories.user({ unit: org.unitOther, grants: [...TASK_EMPLOYEE_GRANTS, ...tagGrants('own')] });
    const admin = await t.factories.user({ grants: [ADMIN_MODE_GRANT, ...tagGrants('all'), { key: P.TasksPoliciesView, scope: 'all' }, { key: P.TasksPoliciesEdit, scope: 'all' }] });
    const employee = await t.factories.user({ unit: org.unitA, grants: TASK_EMPLOYEE_GRANTS });
    await t.db.query('UPDATE org_nodes SET manager_id = $1 WHERE id = $2', [deptManager.employeeId, org.department]);
    const agents = {
      deptManager: await t.factories.signIn(deptManager),
      otherManager: await t.factories.signIn(otherManager),
      employee: await t.factories.signIn(employee),
      admin: await t.factories.signInAdminMode(admin),
      adminNoMode: await t.factories.signIn(admin),
    };
    return { org, deptManager, employee, agents };
  }

  const tag = (orgNodeId: string, over: Record<string, unknown> = {}) => ({ orgNodeId, nameAr: 'تقارير', nameEn: 'Reports', isActive: true, ...over });
  const addTag = async (agent: TestAgent, orgNodeId: string, over: Record<string, unknown> = {}): Promise<TaskTagAdminDto> => (await agent.post('/api/task-tags').send(tag(orgNodeId, over)).expect(201)).body;

  describe('Tags of a department', () => {
    it('lets a person with the own scope keep the tags of their own department, shown with the department name', async () => {
      const w = await world();
      const created = await addTag(w.agents.deptManager, w.org.department);
      expect(created).toMatchObject({ nameAr: 'تقارير', nameEn: 'Reports', isActive: true, orgNodeId: w.org.department, departmentNameEn: 'Department' });
      const listed = (await w.agents.deptManager.get('/api/task-tags').expect(200)).body as TaskTagAdminDto[];
      expect(listed.map((x) => x.id)).toEqual([created.id]);
      const updated = (await w.agents.deptManager.put(`/api/task-tags/${created.id}`).send(tag(w.org.department, { nameEn: 'Meetings', isActive: false })).expect(200)).body as TaskTagAdminDto;
      expect(updated).toMatchObject({ nameEn: 'Meetings', isActive: false });
    });

    it('offers only the departments the person may keep tags for', async () => {
      const w = await world();
      const own = (await w.agents.deptManager.get('/api/task-tags/departments').expect(200)).body as TaskDepartmentOptionDto[];
      expect(own.map((d) => d.id)).toEqual([w.org.department]);
      const all = (await w.agents.admin.get('/api/task-tags/departments').expect(200)).body as TaskDepartmentOptionDto[];
      expect(all.map((d) => d.id)).toEqual(expect.arrayContaining([w.org.department, w.org.otherDepartment, w.org.sectionAB, w.org.unitA.id])); // any unit type
      expect(all.find((d) => d.id === w.org.sectionAB)).toMatchObject({ parentId: w.org.department });
    });

    it('refuses another department\'s tags (404), a unit out of reach (404), an unknown node (422), and a move of a tag', async () => {
      const w = await world();
      await w.agents.deptManager.post('/api/task-tags').send(tag(w.org.otherDepartment)).expect(404);
      await w.agents.deptManager.post('/api/task-tags').send(tag(w.org.unitA.id)).expect(404);
      expect((await w.agents.deptManager.post('/api/task-tags').send(tag('00000000-0000-4000-8000-000000000000')).expect(422)).body.code).toBe('TASK_DEPARTMENT_INVALID');
      const foreign = await addTag(w.agents.admin, w.org.otherDepartment);
      await w.agents.deptManager.put(`/api/task-tags/${foreign.id}`).send(tag(w.org.otherDepartment)).expect(404);
      await w.agents.deptManager.delete(`/api/task-tags/${foreign.id}`).expect(404);
      expect((await w.agents.deptManager.get('/api/task-tags').expect(200)).body).toEqual([]);
      const mine = await addTag(w.agents.deptManager, w.org.department);
      expect((await w.agents.deptManager.put(`/api/task-tags/${mine.id}`).send(tag(w.org.otherDepartment)).expect(422)).body.code).toBe('TASK_DEPARTMENT_INVALID');
    });

    it('lets a tag sit on any unit, and the new-task form offers the tags of the person\'s unit and every unit above it (FR-57)', async () => {
      const w = await world();
      const onSection = await addTag(w.agents.admin, w.org.sectionAB, { nameAr: 'قسمي', nameEn: 'Mine' });
      const onDepartment = await addTag(w.agents.admin, w.org.department, { nameAr: 'إدارتي', nameEn: 'Dept' });
      const onOther = await addTag(w.agents.admin, w.org.sectionC, { nameAr: 'غيري', nameEn: 'Other' });
      const options = (await w.agents.employee.get('/api/tasks/options').expect(200)).body as { tags: { id: string }[] };
      const ids = options.tags.map((x) => x.id);
      expect(ids).toEqual(expect.arrayContaining([onSection.id, onDepartment.id]));
      expect(ids).not.toContain(onOther.id);
    });

    it('lets the all scope work on every department, and validates the input', async () => {
      const w = await world();
      const a = await addTag(w.agents.admin, w.org.department);
      const b = await addTag(w.agents.admin, w.org.otherDepartment, { nameAr: 'اجتماعات', nameEn: 'Meetings' });
      expect(((await w.agents.admin.get('/api/task-tags').expect(200)).body as TaskTagAdminDto[]).map((x) => x.id).sort()).toEqual([a.id, b.id].sort());
      for (const bad of [{ nameAr: '' }, { nameEn: 'x'.repeat(121) }, { orgNodeId: 'x' }, { extra: 1 }]) {
        expect((await w.agents.admin.post('/api/task-tags').send(tag(w.org.department, bad)).expect(400)).body.code).toBe('VALIDATION');
      }
    });

    it('deletes an unused tag and refuses one that tasks use', async () => {
      const w = await world();
      const unused = await addTag(w.agents.deptManager, w.org.department);
      await w.agents.deptManager.delete(`/api/task-tags/${unused.id}`).expect(204);
      const used = await addTag(w.agents.deptManager, w.org.department);
      await w.agents.employee.post('/api/tasks').send({ title: 'بفئة', tagId: used.id }).expect(201);
      expect((await w.agents.deptManager.delete(`/api/task-tags/${used.id}`).expect(409)).body.code).toBe('TASK_TAG_IN_USE');
    });

    it('is closed to people without the keys', async () => {
      const w = await world();
      await w.agents.employee.get('/api/task-tags').expect(403);
      await w.agents.employee.post('/api/task-tags').send(tag(w.org.department)).expect(403);
    });

    it('puts the department\'s tags in the new-task form and accepts them only from that department\'s people', async () => {
      const w = await world();
      const reports = await addTag(w.agents.deptManager, w.org.department);
      await addTag(w.agents.deptManager, w.org.department, { nameAr: 'مغلق', nameEn: 'Off', isActive: false });
      const options = (await w.agents.employee.get('/api/tasks/options').expect(200)).body as { tags: { id: string }[] };
      expect(options.tags.map((x) => x.id)).toEqual([reports.id]);
      const created = (await w.agents.employee.post('/api/tasks').send({ title: 'مهمة', tagId: reports.id }).expect(201)).body;
      expect(created.tag).toMatchObject({ id: reports.id, nameEn: 'Reports' });
      const foreignTag = await addTag(w.agents.admin, w.org.otherDepartment);
      expect((await w.agents.employee.post('/api/tasks').send({ title: 'مهمة', tagId: foreignTag.id }).expect(422)).body.code).toBe('TASK_TAG_INVALID');
      expect((await w.agents.employee.get(`/api/tasks?tagId=${reports.id}`).expect(200)).body.items).toHaveLength(1);
    });
  });

  describe('Task policies', () => {
    it('shows the defaults until an administrator saves, then the saved numbers, which the lists use', async () => {
      const w = await world();
      const before = (await w.agents.admin.get(`/api/task-policies?companyId=${w.org.companyId}`).expect(200)).body as TaskPolicyDto;
      expect(before).toEqual({ companyId: w.org.companyId, ...TASK_POLICY_DEFAULTS });
      const saved = (await w.agents.admin.put(`/api/task-policies?companyId=${w.org.companyId}`).send(POLICY).expect(200)).body as TaskPolicyDto;
      expect(saved).toEqual({ companyId: w.org.companyId, ...POLICY });
      const again = (await w.agents.admin.get(`/api/task-policies?companyId=${w.org.companyId}`).expect(200)).body as TaskPolicyDto;
      expect(again).toEqual(saved);
    });

    it('changes the rules: a shorter stale period makes a quiet task stale', async () => {
      const w = await world();
      const task = (await w.agents.employee.post('/api/tasks').send({ title: 'هادئة' }).expect(201)).body as { id: string };
      await t.db.query(`UPDATE tasks SET status = 'todo', last_activity_at = now() - interval '10 days' WHERE id = $1`, [task.id]);
      expect((await w.agents.employee.get('/api/tasks?stale=true').expect(200)).body.items).toHaveLength(0);
      await w.agents.admin.put(`/api/task-policies?companyId=${w.org.companyId}`).send({ ...TASK_POLICY_DEFAULTS, staleDays: 7 }).expect(200);
      expect((await w.agents.employee.get('/api/tasks?stale=true').expect(200)).body.items).toHaveLength(1);
    });

    it('keeps every number inside its limits, so no value can switch tasks off', async () => {
      const w = await world();
      const url = `/api/task-policies?companyId=${w.org.companyId}`;
      for (const key of Object.keys(TASK_POLICY_LIMITS) as (keyof typeof TASK_POLICY_LIMITS)[]) {
        const { min, max } = TASK_POLICY_LIMITS[key];
        for (const value of [min - 1, max + 1, 1.5]) expect((await w.agents.admin.put(url).send({ ...TASK_POLICY_DEFAULTS, [key]: value }).expect(400)).body.code).toBe('VALIDATION');
        await w.agents.admin.put(url).send({ ...TASK_POLICY_DEFAULTS, [key]: min }).expect(200);
        await w.agents.admin.put(url).send({ ...TASK_POLICY_DEFAULTS, [key]: max }).expect(200);
      }
      await w.agents.admin.put(url).send({ ...TASK_POLICY_DEFAULTS, unknown: 1 }).expect(400);
      await w.agents.admin.put(url).send({ staleDays: 30 }).expect(400);
    });

    it('needs platform admin mode and the keys, and knows its company', async () => {
      const w = await world();
      expect((await w.agents.adminNoMode.get('/api/task-policies').expect(403)).body.code).toBe('ADMIN_MODE_REQUIRED');
      await w.agents.employee.get('/api/task-policies').expect(403);
      await w.agents.deptManager.put('/api/task-policies').send(POLICY).expect(403);
      await w.agents.admin.get('/api/task-policies?companyId=00000000-0000-4000-8000-000000000000').expect(404);
      expect((await w.agents.admin.put('/api/task-policies').send(POLICY).expect(200)).body.companyId).toBeTruthy();
    });

    it('is audited with the numbers, and each company has its own', async () => {
      const w = await world();
      await w.agents.admin.put(`/api/task-policies?companyId=${w.org.companyId}`).send(POLICY).expect(200);
      await new Promise((resolve) => setTimeout(resolve, 200));
      const rows: { changes: Record<string, number> }[] = await t.db.query(`SELECT changes FROM audit_logs WHERE action = 'task.policy.updated'`);
      expect(rows[0]?.changes).toMatchObject({ staleDays: 45 });
      const other = (await w.agents.admin.get(`/api/task-policies?companyId=${w.org.otherCompanyId}`).expect(200)).body as TaskPolicyDto;
      expect(other.staleDays).toBe(TASK_POLICY_DEFAULTS.staleDays);
    });
  });

  it('keeps the manager key sets coherent for the other specs', () => {
    expect(taskManagerGrants('unit').length).toBeGreaterThan(5);
  });
});
