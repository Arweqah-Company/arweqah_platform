import { ORG_ADMIN_PERMISSIONS } from '@arweqah-platform/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { orgTree as tree } from '../../../test/org-fixtures';
import { renderPage } from '../../../test/render';
import { OrgPage } from './org-page';

const open = (keys: string[]) => {
  window.localStorage.setItem('view:org', 'table');
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(keys.map((key) => ({ key, scope: 'all' as const })), { adminMode: true }))),
    http.get('*/api/lookups/companies', () => HttpResponse.json([{ id: 'c1', code: 'ARW', nameAr: 'أروقة الريادة', nameEn: 'Arweqah Alreyadah' }])),
    http.get('*/api/org/companies/c1/tree', () => HttpResponse.json(tree)),
    http.get('*/api/employees/managers', () => HttpResponse.json([])),
  );
  renderPage(<OrgPage />);
};
const rowOf = async (name: string) => (await screen.findByRole('button', { name })).closest('tr') as HTMLElement;

describe('Organization table: every action on a unit is on its row, as icons (FR-31)', () => {
  beforeEach(() => window.localStorage.clear());

  it('offers view, edit, add below, move and delete, each only where it makes sense and with its key', async () => {
    open(ORG_ADMIN_PERMISSIONS);
    const sector = await rowOf('قطاع الخدمات');
    expect(within(sector).getByRole('button', { name: /^عرض/ })).toBeInTheDocument();
    expect(within(sector).getByRole('button', { name: /^تعديل/ })).toBeInTheDocument();
    expect(within(sector).getByRole('button', { name: /^إضافة وحدة تحتها/ })).toBeInTheDocument();
    expect(within(sector).queryByRole('button', { name: /^نقل/ })).not.toBeInTheDocument(); // the top unit has no parent to leave
    expect(within(sector).getByRole('button', { name: /^حذف/ })).toBeInTheDocument();
    const department = await rowOf('إدارة التدريب');
    expect(within(department).queryByRole('button', { name: /^إضافة وحدة تحتها/ })).not.toBeInTheDocument(); // the last level has nothing below it
    expect(within(department).getByRole('button', { name: /^نقل/ })).toBeInTheDocument();
  });

  it('opens the edit form and the delete confirmation as popups from the row', async () => {
    open(ORG_ADMIN_PERMISSIONS);
    const row = await rowOf('إدارة التدريب');
    fireEvent.click(within(row).getByRole('button', { name: /^تعديل/ }));
    expect(await screen.findByRole('dialog', { name: 'تعديل الوحدة' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }));
    fireEvent.click(within(row).getByRole('button', { name: /^حذف/ }));
    expect(await screen.findByRole('dialog', { name: 'حذف الوحدة؟' })).toBeInTheDocument();
  });

  it('shows only the view action to somebody without the organization keys', async () => {
    open(['org.view']);
    const row = await rowOf('إدارة التدريب');
    expect(within(row).getAllByRole('button').map((b) => b.getAttribute('aria-label')).filter(Boolean)).toEqual(['عرض: إدارة التدريب']);
  });
});

const openIcicle = async () => {
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(ORG_ADMIN_PERMISSIONS.map((key) => ({ key, scope: 'all' as const })), { adminMode: true }))),
    http.get('*/api/lookups/companies', () => HttpResponse.json([{ id: 'c1', code: 'ARW', nameAr: 'أروقة الريادة', nameEn: 'Arweqah Alreyadah' }])),
    http.get('*/api/org/companies/c1/tree', () => HttpResponse.json(tree)),
  );
  renderPage(<OrgPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'مخطط طبقي', exact: true } as never));
  return screen.findByRole('group', { name: 'مخطط الهيكل التنظيمي لـ أروقة الريادة' });
};

describe('Organization icicle (FR-31)', () => {
  beforeEach(() => window.localStorage.clear());

  it('shows the units as blocks in rows under the company and selecting one opens its details', async () => {
    const picture = await openIcicle();
    fireEvent.click(within(picture).getByRole('button', { name: /إدارة التدريب/ }));
    expect(await screen.findByRole('complementary', { name: 'إدارة التدريب' })).toBeInTheDocument();
  });

  it('closes and opens any part of the icicle, and shows every name', async () => {
    const picture = await openIcicle();
    expect(within(picture).getByRole('button', { name: /^إدارة التدريب/ })).toBeInTheDocument();
    fireEvent.click(within(picture).getByRole('button', { name: /طي «قطاع الخدمات»/ }));
    expect(within(picture).queryByRole('button', { name: /^إدارة التدريب/ })).not.toBeInTheDocument();
    fireEvent.click(within(picture).getByRole('button', { name: /فتح «قطاع الخدمات»/ }));
    expect(within(picture).getByRole('button', { name: /^إدارة التدريب/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'طي الكل' }));
    expect(within(picture).queryByRole('button', { name: /^قطاع الخدمات/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'فتح الكل' }));
    expect(within(picture).getByRole('button', { name: /^إدارة التدريب/ })).toBeInTheDocument();
  });
});
