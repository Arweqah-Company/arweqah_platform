import { ORG_ADMIN_PERMISSIONS } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { OrgPage } from './org-page';

const level = (id: string, sortOrder: number, names: [string, string], isAssignable = false) => ({ id, companyId: 'c1', sortOrder, nameAr: names[0], nameEn: names[1], isAssignable, templateCode: ['sector', 'department', 'section', 'unit'][sortOrder - 1] ?? null, unitsCount: 0 });
const emptyTree = { companyId: 'c1', nodes: [], levels: [level('l1', 1, ['قطاع', 'Sector']), level('l2', 2, ['إدارة', 'Department']), level('l3', 3, ['قسم', 'Section']), level('l4', 4, ['وحدة', 'Unit'], true)] };

const open = (adminMode = true) => {
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(ORG_ADMIN_PERMISSIONS.map((key) => ({ key, scope: 'all' as const })), { adminMode }))),
    http.get('*/api/lookups/companies', () => HttpResponse.json([{ id: 'c1', code: 'ARW', nameAr: 'أروقة الريادة', nameEn: 'Arweqah Alreyadah' }])),
    http.get('*/api/org/companies/c1/tree', () => HttpResponse.json(emptyTree)),
  );
  renderPage(<OrgPage />);
};

describe('Structure buttons need platform admin mode (FR-24)', () => {
  it('hides add unit, add job title and the levels form from a person who holds the keys while admin mode is off', async () => {
    open(false);
    await screen.findByText(/قطاع › إدارة › قسم › وحدة/);
    for (const name of ['إضافة وحدة', 'إضافة مسمى وظيفي', 'تقسيمات الهيكل']) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
  });

  it('shows them while admin mode is on', async () => {
    open(true);
    await screen.findByText(/قطاع › إدارة › قسم › وحدة/);
    for (const name of ['إضافة وحدة', 'إضافة مسمى وظيفي', 'تقسيمات الهيكل']) expect(screen.getByRole('button', { name })).toBeInTheDocument();
  });
});

describe('Organization page for a company with no units yet (FR-13)', () => {
  it('shows the company levels and opens the levels form from the button', async () => {
    open();
    expect(await screen.findByText(/قطاع › إدارة › قسم › وحدة/)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'تقسيمات الهيكل' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('opens the add-unit form even when the tree is empty', async () => {
    open();
    await screen.findByText(/قطاع › إدارة › قسم › وحدة/);
    fireEvent.click(screen.getByRole('button', { name: 'إضافة وحدة' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('asks for the day the unit started working, and explains a missing or senseless date as the person types (FR-35)', async () => {
    open();
    await screen.findByText(/قطاع › إدارة › قسم › وحدة/);
    fireEvent.click(screen.getByRole('button', { name: 'إضافة وحدة' }));
    const start = await screen.findByLabelText('تاريخ بدء العمل *');
    expect(screen.queryByText('هذا الحقل مطلوب.')).not.toBeInTheDocument();
    fireEvent.blur(start);
    expect(await screen.findByText('هذا الحقل مطلوب.')).toBeInTheDocument();
    fireEvent.change(start, { target: { value: '1900-01-01' } });
    expect(await screen.findByText(/تاريخ غير معقول/)).toBeInTheDocument();
    fireEvent.change(start, { target: { value: '2022-03-15' } });
    await waitFor(() => expect(screen.queryByText(/تاريخ غير معقول/)).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'حفظ' })).toBeDisabled(); // the names are still empty
  });
});

const U = { sector: 'aaaaaaaa-0000-4000-8000-000000000001', dept: 'aaaaaaaa-0000-4000-8000-000000000002', unit: 'aaaaaaaa-0000-4000-8000-000000000003' };
const node = (id: string, parent: { parentId: string | null; levelId: string }, nameAr: string, employeesCount: number) => ({ id, companyId: 'c1', ...parent, nameAr, nameEn: nameAr, pathAr: nameAr, pathEn: nameAr, managerId: null, managerName: id === U.dept ? 'خالد' : null, startDate: '2024-01-01', isActive: true, employeesCount, jobTitles: [] });
const filledTree = { ...emptyTree, nodes: [node(U.sector, { parentId: null, levelId: 'l1' }, 'القطاع التنفيذي', 0), node(U.dept, { parentId: U.sector, levelId: 'l2' }, 'إدارة الموارد البشرية', 3), node(U.unit, { parentId: U.dept, levelId: 'l4' }, 'وحدة التوظيف', 2)] };

describe('Organization chart and table (FR-31)', () => {
  const openFilled = () => {
    server.use(
      http.get('*/api/me', () => HttpResponse.json(me(ORG_ADMIN_PERMISSIONS.map((key) => ({ key, scope: 'all' as const })), { adminMode: true }))),
      http.get('*/api/lookups/companies', () => HttpResponse.json([{ id: 'c1', code: 'ARW', nameAr: 'أروقة الريادة', nameEn: 'Arweqah Alreyadah' }])),
      http.get('*/api/org/companies/c1/tree', () => HttpResponse.json(filledTree)),
    );
    renderPage(<OrgPage />);
  };

  it('shows the company as the root of a chart with the units below, and opens the units under a node', async () => {
    openFilled();
    expect(await screen.findByRole('group', { name: 'مخطط الهيكل التنظيمي لـ أروقة الريادة' })).toBeInTheDocument();
    expect(screen.getByText('3 وحدة · 5 موظف')).toBeInTheDocument();
    expect(screen.getByText('القطاع التنفيذي')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /طي «أروقة الريادة»/ }));
    expect(screen.queryByText('القطاع التنفيذي')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /فتح «أروقة الريادة»/ }));
    expect(screen.getByText('القطاع التنفيذي')).toBeInTheDocument();
  });

  it('finds a unit from the search box by opening the nodes above it', async () => {
    openFilled();
    await screen.findByRole('group', { name: /مخطط الهيكل/ });
    fireEvent.click(screen.getByRole('button', { name: 'طي الكل' }));
    expect(screen.queryByText('وحدة التوظيف')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('بحث في المخطط'), { target: { value: 'التوظيف' } });
    expect(await screen.findByText('وحدة التوظيف')).toBeInTheDocument();
  });

  it('switches to a table of the same units with search, and selecting a unit shows its details', async () => {
    openFilled();
    await screen.findByRole('group', { name: /مخطط الهيكل/ });
    fireEvent.click(screen.getByRole('button', { name: 'جدول', exact: true } as never));
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(4);
    fireEvent.change(screen.getByLabelText('بحث في الوحدات'), { target: { value: 'خالد' } });
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(2));
    fireEvent.click(screen.getByRole('button', { name: 'إدارة الموارد البشرية' }));
    expect(await screen.findByRole('complementary', { name: 'إدارة الموارد البشرية' })).toBeInTheDocument();
    expect(screen.getByText('بدأت العمل')).toBeInTheDocument();
    expect(screen.getByText('2024-01-01')).toBeInTheDocument();
  });
});

