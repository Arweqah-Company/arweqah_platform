import type { DirectoryEntryDto, DirectoryProfileDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { access, me, server } from '../../../test/msw';
import { renderRoute } from '../../../test/render';
import { EmployeesPage } from './employees-page';
import { TeamTab } from './team-tab';

const company = { id: 'c1', nameAr: 'أروقة', nameEn: 'Arweqah' };
const entry = (over: Partial<DirectoryEntryDto> = {}): DirectoryEntryDto => ({
  id: 'e1', fullName: 'خالد المدير', fullNameEn: null, photoFileId: null, company,
  orgNode: { id: 'n1', nameAr: 'وحدة', nameEn: 'Unit', pathAr: 'قطاع › وحدة', pathEn: 'Sector › Unit' }, jobTitle: { id: 't1', nameAr: 'مطور', nameEn: 'Developer' },
  workEmail: 'khaled@arweqah.sa', workPhone: '0500000000', ...over,
});
const profile = (over: Partial<DirectoryProfileDto> = {}): DirectoryProfileDto => ({ ...entry(), level: 'basic', manager: { id: 'b1', fullName: 'نورة' }, details: null, ...over });

const placed = (orgNodeId: string | null) => ({ ...me(), placement: { companyId: 'c1', orgNodeId, managerId: null } });

function serve(keys: string[], seen: string[] = [], orgNodeId: string | null = 'n1') {
  server.use(
    http.get('*/api/me', () => HttpResponse.json(placed(orgNodeId))),
    http.get('*/api/lookups/job-titles', () => HttpResponse.json([{ id: 't1', nameAr: 'مطور', nameEn: 'Developer' }])),
    http.get('*/api/me/access', () => HttpResponse.json(access(keys.map((key) => ({ key, scope: 'all' as const }))))),
    http.get('*/api/lookups/companies', () => HttpResponse.json([{ id: 'c1', nameAr: 'أروقة', nameEn: 'Arweqah', code: 'ARW' }])),
    http.get('*/api/directory', ({ request }) => {
      seen.push(new URL(request.url).search);
      return HttpResponse.json({ items: [entry()], total: 1, page: 1, pageSize: 20 });
    }),
  );
}
const open = () => renderRoute([{ path: '/directory', element: <TeamTab /> }], '/directory');

describe('My team tab (FR-92)', () => {
  it('lists colleagues with their basics and searches on the server', async () => {
    const seen: string[] = [];
    serve(['directory.view'], seen);
    open();
    expect(await screen.findByText('خالد المدير')).toBeInTheDocument();
    expect(screen.getAllByText('مطور').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole('searchbox', { name: 'ابحث في فريقي' }), { target: { value: 'خالد' } });
    await waitFor(() => expect(seen.some((q) => q.includes('search='))).toBe(true));
  });

  it('opens the profile of a row: basics for a colleague, no personal details', async () => {
    serve(['directory.view']);
    server.use(http.get('*/api/directory/e1', () => HttpResponse.json(profile())));
    open();
    fireEvent.click(await screen.findByText('خالد المدير'));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('بيانات أساسية')).toBeInTheDocument();
    expect(within(dialog).queryByText('الجوال الشخصي')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('link', { name: 'فتح سجل الموظف' })).not.toBeInTheDocument();
  });

  it('shows the personal contact to a manager and the link to the record to who may open it', async () => {
    serve(['directory.view']);
    server.use(http.get('*/api/directory/e1', () => HttpResponse.json(profile({ level: 'full', details: { workLocation: null, workMode: 1, startDate: '2024-01-01', personalPhone: '0555555555', personalEmail: null } }))));
    open();
    fireEvent.click(await screen.findByText('خالد المدير'));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('0555555555')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'فتح سجل الموظف' })).toHaveAttribute('href', '/employees/e1');
  });

  it('offers the export only with the export key', async () => {
    serve(['directory.view']);
    open();
    await screen.findByText('خالد المدير');
    expect(screen.queryByRole('button', { name: /تصدير/ })).not.toBeInTheDocument();
  });

  it('explains an empty team for a person with no unit yet', async () => {
    serve(['directory.view'], [], null);
    server.use(http.get('*/api/directory', () => HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20 })));
    open();
    expect(await screen.findByText('لا وحدة لك بعد.')).toBeInTheDocument();
  });
});

describe('The Employees page tabs (FR-92)', () => {
  const page = (keys: string[], hidden: string[] = [], at = '/employees') => {
    serve(keys);
    server.use(http.get('*/api/me', () => HttpResponse.json({ ...placed('n1'), hiddenPages: hidden })));
    renderRoute([{ path: '/employees', element: <EmployeesPage /> }], at);
  };

  it('shows «Employees» and «My team» to who holds both keys, and opens the team from the address', async () => {
    page(['employees.view', 'directory.view'], [], '/employees?tab=team');
    const tabs = await screen.findByRole('tablist', { name: 'أقسام صفحة الموظفين' });
    expect(within(tabs).getByRole('tab', { name: 'الموظفون' })).toHaveAttribute('aria-selected', 'false');
    expect(within(tabs).getByRole('tab', { name: 'فريقي' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('خالد المدير')).toBeInTheDocument();
  });

  it('leaves «My team» out when the key is missing or an administrator hid the page from the role', async () => {
    page(['employees.view'], [], '/employees');
    expect(screen.queryByRole('tab', { name: 'فريقي' })).not.toBeInTheDocument();
  });

  it('opens the list tab for a hidden team page even when the address asks for the team', async () => {
    page(['employees.view', 'directory.view'], ['directory'], '/employees?tab=team');
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByText('خالد المدير')).not.toBeInTheDocument();
  });
});
