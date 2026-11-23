import { CorePermission, EMPLOYEE_FIELD_KEYS, type EmployeeDto, type EmployeeListItemDto, type Paginated, type PermissionGrant } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { useTestApp } from './setup/test-app';

const P = CorePermission;
const grant = (key: string, scope: PermissionGrant['scope'], fields?: string[]): PermissionGrant => ({ key, scope, ...(fields && { fields }) });

describe("Opening an employee's page: its own key, the details it shows, and the buttons by reach (FR-178)", () => {
  const t = useTestApp();

  async function setup(grants: PermissionGrant[]) {
    const org = await t.factories.org();
    const viewer = await t.factories.user({ unit: org.unitA, grants });
    const colleague = await t.factories.user({ unit: org.unitA });
    return { viewer, colleague, agent: await t.factories.signIn(viewer) };
  }

  it("lists every row but marks only the rows the open key reaches: the eye and the page are for one's own record at «own»", async () => {
    const { viewer, colleague, agent } = await setup([grant(P.EmployeesView, 'all')]);
    const rows = ((await agent.get('/api/employees?pageSize=100').expect(200)).body as Paginated<EmployeeListItemDto>).items;
    expect(rows.find((r) => r.id === viewer.employeeId)?.canOpen).toBe(true);
    expect(rows.find((r) => r.id === colleague.employeeId)?.canOpen).toBe(false);
    await agent.get(`/api/employees/${colleague.employeeId}`).expect(404);
    await agent.get(`/api/employees/${viewer.employeeId}`).expect(200);
  });

  it('opens a colleague with the key at a wider reach, and shows only the details its fields list; the page header is never hidden', async () => {
    const { colleague, agent } = await setup([grant(P.EmployeesView, 'all'), grant(P.EmployeesOpen, 'all', ['workPhone', 'workLocation'])]);
    const record = (await agent.get(`/api/employees/${colleague.employeeId}`).expect(200)).body as EmployeeDto;
    expect(record.visibleFields).toEqual(expect.arrayContaining(['workPhone', 'workLocation', 'fullName', 'employeeNumber', 'companyId']));
    expect(record.visibleFields).not.toContain('personalPhone');
    expect(record.personalPhone).toBeNull();
    expect(record.birthDate).toBeNull();
    expect(record.roles).toEqual([]);
    expect(record.fullName).toBeTruthy();
    expect(record.company.id).toBeTruthy();
  });

  it('shows every detail where the grant has no list of its own (the default, and what the migration gave the old «view» holders), and the editor of a record loads it whole', async () => {
    const { colleague, agent } = await setup([grant(P.EmployeesView, 'all'), grant(P.EmployeesOpen, 'all')]);
    const all = (await agent.get(`/api/employees/${colleague.employeeId}`).expect(200)).body as EmployeeDto;
    expect(all.visibleFields).toEqual(expect.arrayContaining([...EMPLOYEE_FIELD_KEYS, 'roles']));
    expect(all.roles.length).toBeGreaterThan(0);
    const editor = await t.factories.signIn(await t.factories.user({ grants: [grant(P.EmployeesView, 'all'), grant(P.EmployeesUpdate, 'all', ['workPhone']), grant(P.EmployeesOpen, 'own', ['workPhone'])] }));
    expect(((await editor.get(`/api/employees/${colleague.employeeId}`).expect(200)).body as EmployeeDto).visibleFields).toBeNull();
    const roles = await t.factories.signIn(await t.factories.user({ grants: [grant(P.EmployeesView, 'all'), grant(P.EmployeesAssignRoles, 'all'), grant(P.EmployeesOpen, 'own', ['workPhone'])] }));
    expect(((await roles.get(`/api/employees/${colleague.employeeId}`).expect(200)).body as EmployeeDto).visibleFields).toBeNull();
  });

  it("offers the photo buttons and the history tab only where the keys reach: a key held at «own» is for one's own record", async () => {
    const { viewer, colleague, agent } = await setup([grant(P.EmployeesView, 'all'), grant(P.EmployeesOpen, 'all'), grant(P.EmployeesPhotoUpdate, 'own'), grant(P.EmployeesHistoryView, 'own')]);
    const mine = (await agent.get(`/api/employees/${viewer.employeeId}`).expect(200)).body as EmployeeDto;
    const theirs = (await agent.get(`/api/employees/${colleague.employeeId}`).expect(200)).body as EmployeeDto;
    expect([mine.canChangePhoto, mine.canViewHistory]).toEqual([true, true]);
    expect([theirs.canChangePhoto, theirs.canViewHistory]).toEqual([false, false]);
    await agent.delete(`/api/employees/${colleague.employeeId}/photo`).expect(404);
    await agent.get(`/api/employees/${colleague.employeeId}/changes`).expect(404);
  });

  it('is refused to a person without the key: 403 without «view», 404 for a record the open key does not reach', async () => {
    const org = await t.factories.org();
    const nobody = await t.factories.signIn(await t.factories.user({ unit: org.unitA, without: ['employees.'] }));
    const other = await t.factories.user({ unit: org.unitA });
    await nobody.get(`/api/employees/${other.employeeId}`).expect(403);
  });

  it("opens a short page as a pop-up: under 10 listed details and no key that acts on the record; any such key, or a full list, keeps the page", async () => {
    const few = ['workPhone', 'workLocation'];
    const { viewer, colleague, agent } = await setup([grant(P.EmployeesView, 'all'), grant(P.EmployeesOpen, 'all', few)]);
    const rows = async (who: typeof agent) => ((await who.get('/api/employees?pageSize=100').expect(200)).body as Paginated<EmployeeListItemDto>).items;
    const seen = await rows(agent);
    expect(seen.find((r) => r.id === colleague.employeeId)?.openAs).toBe('dialog');
    expect(seen.find((r) => r.id === viewer.employeeId)?.openAs).toBe('page');
    const acting = await setup([grant(P.EmployeesView, 'all'), grant(P.EmployeesOpen, 'all', few), grant(P.EmployeesDeactivate, 'all')]);
    expect((await rows(acting.agent)).find((r) => r.id === acting.colleague.employeeId)?.openAs).toBe('page');
    const full = await setup([grant(P.EmployeesView, 'all'), grant(P.EmployeesOpen, 'all')]);
    expect((await rows(full.agent)).find((r) => r.id === full.colleague.employeeId)?.openAs).toBe('page');
  });
});
