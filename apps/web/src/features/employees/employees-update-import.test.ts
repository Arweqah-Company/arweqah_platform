import type { EmployeeDto, EmployeeListItemDto, OrgReferenceDto } from '@arweqah-platform/shared';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import i18n from '@/core/i18n';
import { server } from '../../../test/msw';
import type { EmployeeImportContext } from './employees-import-rows';
import { IMPORT_REASON, prepareUpdateRows } from './employees-update-import';

const COMPANY = '11111111-1111-4111-8111-111111111111';
const UNIT_A = '33333333-3333-4333-8333-333333333333';
const UNIT_B = '44444444-4444-4444-8444-444444444444';
const reference: OrgReferenceDto[] = [
  { companyId: COMPANY, units: [
    { id: UNIT_A, path: 'a', pathAr: 'قطاع › وحدة', pathEn: 'Sector › Unit', nameAr: 'وحدة', nameEn: 'Unit', defaultManagerId: null, titles: [{ id: '55555555-5555-4555-8555-555555555555', name: 'مطور', nameAr: 'مطور', nameEn: 'Developer' }] },
    { id: UNIT_B, path: 'b', pathAr: 'قطاع › وحدة ثانية', pathEn: 'Sector › Second', nameAr: 'وحدة ثانية', nameEn: 'Second', defaultManagerId: null, titles: [{ id: '66666666-6666-4666-8666-666666666666', name: 'محاسب', nameAr: 'محاسب', nameEn: 'Accountant' }] },
  ] },
];
const ctx: EmployeeImportContext = {
  lists: { workMode: [{ id: '1', labels: ['هجين', 'Hybrid'] }] },
  reference,
  headers: { employeeNumber: 'الرقم', orgNodeId: 'الوحدة', jobTitleId: 'المسمى', workLocation: 'مقر العمل', workMode: 'نمط العمل', managerNumber: 'مدير' },
  t: i18n.t.bind(i18n),
};
const found = { id: 'e1', employeeNumber: 'E1', fullName: 'سارة', company: { id: COMPANY, nameAr: 'أ', nameEn: 'A' }, orgNode: { id: UNIT_A, nameAr: 'وحدة', nameEn: 'Unit', pathAr: 'x', pathEn: 'x' } } as unknown as EmployeeListItemDto;
const saved = {
  id: 'e1', employeeNumber: 'E1', fullName: 'سارة', workEmail: 'sara@arweqah.sa', startDate: '2024-01-01', sensitiveHidden: true, roles: [], groups: [], manager: null,
  company: { id: COMPANY, nameAr: 'أ', nameEn: 'A' }, orgNode: { id: UNIT_A }, jobTitle: { id: '55555555-5555-4555-8555-555555555555' }, workLocation: 'Riyadh',
} as unknown as EmployeeDto;

function serve(people: EmployeeListItemDto[]) {
  const sent: Record<string, unknown>[] = [];
  const asked: string[] = [];
  server.use(
    http.get('*/api/employees', ({ request }) => { asked.push(new URL(request.url).searchParams.get('employeeNumbers') ?? ''); return HttpResponse.json({ items: people, total: people.length, page: 1, pageSize: 100 }); }),
    http.get('*/api/employees/e1', () => HttpResponse.json(saved)),
    http.put('*/api/employees/e1', async ({ request }) => { sent.push((await request.json()) as Record<string, unknown>); return HttpResponse.json(saved); }),
  );
  return { sent, asked };
}

describe('Import in update mode (FR-95)', () => {
  it('finds people by number in one request, and refuses a number nobody holds, with the reason', async () => {
    const { asked } = serve([found]);
    const rows = await prepareUpdateRows([{ rowNumber: 2, cells: { employeeNumber: 'E1', workLocation: 'Jeddah' } }, { rowNumber: 3, cells: { employeeNumber: 'E9', workLocation: 'Jeddah' } }], ctx, '2026-11-04');
    expect(asked).toEqual(['E1,E9']);
    expect(rows[0]?.errors).toEqual([]);
    expect(rows[1]?.run).toBeUndefined();
    expect(rows[1]?.errors.join(' ')).toContain('E9');
  });

  it('changes only what the row fills: the saved record is kept, the filled cell wins, and the placement change starts today with the import reason', async () => {
    const { sent } = serve([found]);
    const [row] = await prepareUpdateRows([{ rowNumber: 2, cells: { employeeNumber: 'E1', workMode: 'Hybrid', orgNodeId: 'Sector › Second', jobTitleId: 'Accountant' } }], ctx, '2026-11-04');
    expect(row?.errors).toEqual([]);
    await row?.run?.();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ workLocation: 'Riyadh', workMode: 1, orgNodeId: UNIT_B, jobTitleId: '66666666-6666-4666-8666-666666666666', effectiveFrom: '2026-11-04', changeReason: IMPORT_REASON, employeeNumber: 'E1' });
  });

  it('refuses a new unit without its title, a row with nothing to change, and a number written twice', async () => {
    serve([found]);
    const rows = await prepareUpdateRows([
      { rowNumber: 2, cells: { employeeNumber: 'E1', orgNodeId: 'Sector › Second' } },
      { rowNumber: 3, cells: { employeeNumber: 'E1' } },
      { rowNumber: 4, cells: { employeeNumber: 'E1', workLocation: 'x' } },
    ], ctx, '2026-11-04');
    expect(rows[0]?.run).toBeUndefined();
    expect(rows[1]?.run).toBeUndefined();
    expect(rows[2]?.run).toBeUndefined();
    expect(rows[2]?.errors.join(' ')).toContain('الرقم');
  });
});
