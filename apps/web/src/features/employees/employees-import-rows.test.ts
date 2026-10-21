import type { OrgReferenceDto } from '@arweqah-platform/shared';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import i18n from '@/core/i18n';
import { server } from '../../../test/msw';
import { prepareEmployeeRows, type EmployeeImportContext } from './employees-import-rows';

const reference: OrgReferenceDto[] = [
  { companyId: '11111111-1111-4111-8111-111111111111', units: [{ id: '33333333-3333-4333-8333-333333333333', path: 'a', pathAr: 'قطاع › وحدة', pathEn: 'Sector › Unit', defaultManagerId: null, titles: [{ id: '55555555-5555-4555-8555-555555555555', name: 'مطور', nameAr: 'مطور', nameEn: 'Developer' }] }] },
  { companyId: '22222222-2222-4222-8222-222222222222', units: [{ id: '44444444-4444-4444-8444-444444444444', path: 'b', pathAr: 'قطاع آخر › وحدة', pathEn: 'Other › Unit', defaultManagerId: null, titles: [{ id: '66666666-6666-4666-8666-666666666666', name: 'محاسب', nameAr: 'محاسب', nameEn: 'Accountant' }] }] },
];
const ctx: EmployeeImportContext = {
  lists: { companyId: [{ id: '11111111-1111-4111-8111-111111111111', labels: ['شركة أ', 'Company A'] }, { id: '22222222-2222-4222-8222-222222222222', labels: ['شركة ب', 'Company B'] }], gender: [{ id: '0', labels: ['ذكر', 'Male'] }, { id: '1', labels: ['أنثى', 'Female'] }], workMode: [] },
  reference,
  headers: { companyId: 'الشركة', orgNodeId: 'الوحدة', jobTitleId: 'المسمى', workEmail: 'البريد', employeeNumber: 'الرقم', fullName: 'الاسم', startDate: 'البداية', gender: 'الجنس' },
  t: i18n.t.bind(i18n),
};
const good = { companyId: 'Company A', orgNodeId: 'Sector › Unit', jobTitleId: 'Developer', workEmail: 'Sara@arweqah.sa', employeeNumber: 'E1', fullName: 'سارة أحمد', startDate: '2026-01-05', gender: 'أنثى' };

describe('Employees import (FR-29)', () => {
  it('maps names to ids, in either language, and sends the employee as the form would', async () => {
    let body: Record<string, unknown> = {};
    server.use(http.post('*/api/employees', async ({ request }) => { body = (await request.json()) as Record<string, unknown>; return HttpResponse.json({}, { status: 201 }); }));
    const [row] = prepareEmployeeRows([{ rowNumber: 2, cells: good }], ctx);
    expect(row?.errors).toEqual([]);
    await row?.run?.();
    expect(body).toMatchObject({ companyId: '11111111-1111-4111-8111-111111111111', orgNodeId: '33333333-3333-4333-8333-333333333333', jobTitleId: '55555555-5555-4555-8555-555555555555', workEmail: 'sara@arweqah.sa', gender: 1, managerId: null });
  });

  it('rejects a unit that belongs to another company, a missing required cell and a wrong e-mail domain', () => {
    const rows = prepareEmployeeRows(
      [
        { rowNumber: 2, cells: { ...good, orgNodeId: 'Other › Unit' } },
        { rowNumber: 3, cells: { ...good, employeeNumber: '', workEmail: 'x@gmail.com' } },
      ],
      ctx,
    );
    expect(rows[0]?.run).toBeUndefined();
    expect(rows[0]?.errors.join(' ')).toContain('الوحدة');
    expect(rows[1]?.run).toBeUndefined();
    expect(rows[1]?.errors.join(' ')).toContain('الرقم');
  });

  it('flags a work e-mail or employee number that appears twice in the file', () => {
    const [first, second] = prepareEmployeeRows([{ rowNumber: 2, cells: good }, { rowNumber: 3, cells: { ...good, workEmail: 'SARA@arweqah.sa', employeeNumber: 'E1' } }], ctx);
    expect(first?.errors).toEqual([]);
    expect(second?.errors).toHaveLength(2);
  });

  it('reports a direct manager number that does not exist, when the row runs', async () => {
    server.use(http.get('*/api/employees/managers', () => HttpResponse.json([])));
    const [row] = prepareEmployeeRows([{ rowNumber: 2, cells: { ...good, managerNumber: 'NOPE' } }], ctx);
    await expect(row?.run?.()).rejects.toMatchObject({ code: 'MANAGER_NOT_FOUND' });
  });
});
