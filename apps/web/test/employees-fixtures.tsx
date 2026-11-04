import type { EmployeeDto, EmployeeListItemDto } from '@arweqah-platform/shared';
import { http, HttpResponse, type RequestHandler } from 'msw';
import { EmployeeDetailsPage } from '@/features/employees/employee-details-page';
import { access, me, server } from './msw';
import { renderRoute } from './render';

const NO_NAMES = { relationType: null, workCountry: null, nationality: null, maritalStatus: null, residencyStatus: null, idType: null, contractType: null, contractCompany: null, gosiCompany: null, healthInsurance: null, healthInsuranceCompany: null, gosiSystem: null, terminationReason: null, salaryCurrency: null };

/** The company the fixtures belong to. */
export const COMPANY = { id: 'c1', nameAr: 'أروقة الريادة', nameEn: 'Arweqah' };

/** One employee as the API sends it to a viewer who may not see sensitive data. */
export const employeeFixture = (over: Partial<EmployeeDto> = {}): EmployeeDto =>
  ({
    id: 'e1', photoFileId: null, userId: 'u1', isActive: true, isSystemAccount: false, authenticatorEnabled: true, accessEndedAt: null, employeeNumber: 'N1', fullName: 'سارة أحمد', workEmail: 'sara@arweqah.sa',
    company: COMPANY, relationTypeId: null, orgNode: null, jobTitle: null, manager: null, roles: [], groups: [], startDate: '2024-01-01', endDate: null, sensitiveHidden: true, notes: null, names: NO_NAMES, ...over,
  }) as unknown as EmployeeDto;

/** One row of the employee list. */
export const listItemFixture = (over: Partial<EmployeeListItemDto> = {}): EmployeeListItemDto => ({
  id: 'e1', photoFileId: null, userId: 'u1', employeeNumber: 'N1', fullName: 'خالد المدير', workEmail: 'k@arweqah.sa', company: COMPANY, orgNode: null, jobTitle: null, isActive: true, needsPlacement: false,
  idExpiresSoon: false, contractEndsSoon: false, isOwn: false, ...over,
});

const granted = (keys: string[]) => keys.map((key) => ({ key, scope: 'all' as const }));

/** The person signed in with `keys` (at every scope) and `extra` handlers on top. */
export function serveAs(keys: string[], ...extra: RequestHandler[]): void {
  server.use(http.get('*/api/me', () => HttpResponse.json(me(granted(keys)))), http.get('*/api/me/access', () => HttpResponse.json(access(granted(keys)))), ...extra);
}

/** The employee page of `e1` for someone holding `keys`, opened on `search` (e.g. `?tab=history`). */
export function openEmployeePage(keys: string[], employee: EmployeeDto = employeeFixture(), search = '', ...extra: RequestHandler[]): void {
  serveAs(keys, http.get('*/api/employees/e1', () => HttpResponse.json(employee)), ...extra);
  renderRoute([{ path: '/employees/:id', element: <EmployeeDetailsPage /> }], `/employees/e1${search}`);
}

/** The employee list with `items` for someone holding `keys`; `extra` handlers go on top. */
export function serveEmployeeList(keys: string[], items: EmployeeListItemDto[] = [listItemFixture()], ...extra: RequestHandler[]): void {
  serveAs(
    keys,
    http.get('*/api/employees', () => HttpResponse.json({ items, total: items.length, page: 1, pageSize: 20 })),
    http.get('*/api/employees/summary', () => HttpResponse.json({ total: items.length, active: items.length, idExpiring: 0, contractEnding: 0, needsPlacement: 0 })),
    ...extra,
  );
}
