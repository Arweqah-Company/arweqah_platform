import type { PermissionTargetDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { catalog, me, roles, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { PermissionsPage } from './permissions-page';
import { chooseOption } from '../../../test/select';

const role: PermissionTargetDto = { kind: 'role', id: 'r1', nameAr: 'موظف', nameEn: 'Employee', permissions: [], inherited: [] };

function serve(keys: string[]) {
  const saved: unknown[] = [];
  server.use(
    http.get('*/api/me', () => HttpResponse.json({ ...me(keys.map((key) => ({ key, scope: 'all' as const }))), adminMode: { available: true, active: true, expiresAt: null } })),
    http.get('*/api/permissions/catalog', () => HttpResponse.json(catalog)),
    http.get('*/api/permission-targets/role', () => HttpResponse.json([{ id: 'r1', nameAr: 'موظف', nameEn: 'Employee' }])),
    http.get('*/api/permission-targets/role/r1', () => HttpResponse.json(role)),
    http.get('*/api/role-groups', () => HttpResponse.json([])),
    http.get('*/api/user-groups', () => HttpResponse.json([])),
    http.put('*/api/permission-targets/role/r1', async ({ request }) => {
      saved.push(await request.json());
      return HttpResponse.json(role);
    }),
  );
  return saved;
}

describe('Permissions page (FR-47)', () => {
  it('offers a search box inside the drop-down of roles', async () => {
    serve(['permissions.view']);
    renderPage(<PermissionsPage />);
    fireEvent.click(await screen.findByLabelText('الدور'));
    expect(await screen.findByPlaceholderText('ابحث…')).toBeInTheDocument();
  });

  it('places permissions on a role: choose the kind and the role, tick, save', async () => {
    const saved = serve(['permissions.view', 'permissions.role_update']);
    renderPage(<PermissionsPage />);
    expect(await screen.findByLabelText('أضع الصلاحيات على')).toHaveTextContent('دور');
    await chooseOption((await screen.findByLabelText('الدور')), 'r1');
    const box = await screen.findByRole('checkbox', { name: 'عرض الموظفين' });
    const save = await screen.findByRole('button', { name: 'حفظ' });
    expect(save).toBeDisabled();
    fireEvent.click(box);
    fireEvent.click(save);
    await waitFor(() => expect(saved).toHaveLength(1));
    expect((saved[0] as { permissions: { key: string }[] }).permissions.map((p) => p.key)).toEqual(['employees.view']);
  });

  it('hides the save button without the key of that kind, and offers a new group only with its key', async () => {
    serve(['permissions.view']);
    renderPage(<PermissionsPage />);
    await chooseOption((await screen.findByLabelText('الدور')), 'r1');
    await screen.findByRole('checkbox', { name: 'عرض الموظفين' });
    expect(screen.queryByRole('button', { name: 'حفظ' })).not.toBeInTheDocument();
    await chooseOption(screen.getByLabelText('أضع الصلاحيات على'), 'role-group');
    expect(screen.queryByRole('button', { name: 'مجموعة أدوار جديدة' })).not.toBeInTheDocument();
  });

  it('offers a new group of roles and a new group of people from the same page', async () => {
    serve(['permissions.view', 'role_groups.create', 'user_groups.create']);
    renderPage(<PermissionsPage />);
    await chooseOption((await screen.findByLabelText('أضع الصلاحيات على')), 'role-group');
    expect(await screen.findByRole('button', { name: 'مجموعة أدوار جديدة' })).toBeInTheDocument();
    await chooseOption(screen.getByLabelText('أضع الصلاحيات على'), 'user-group');
    expect(await screen.findByRole('button', { name: 'مجموعة مستخدمين جديدة' })).toBeInTheDocument();
  });

});

describe('Permissions page: groups of roles and fields (FR-46, FR-94)', () => {
  it('says so when there are no groups of roles yet (FR-46)', async () => {
    serve(['permissions.view']);
    server.use(http.get('*/api/permission-targets/role-group', () => HttpResponse.json([])));
    renderPage(<PermissionsPage />);
    await chooseOption((await screen.findByLabelText('أضع الصلاحيات على')), 'role-group');
    expect(await screen.findByText(/لا توجد مجموعات أدوار بعد/)).toBeInTheDocument();
  });

  it('ticks several existing roles in one open drop-down for the chosen group of roles and saves them (FR-46)', async () => {
    serve(['permissions.view', 'role_groups.update']);
    const group = { id: 'g1', nameAr: 'فريق', nameEn: 'Team', description: null, roles: [], usersCount: 0 };
    const saved: unknown[] = [];
    server.use(
      http.get('*/api/roles', () => HttpResponse.json([{ ...roles[0], id: 'a1', nameAr: 'دور أ', nameEn: 'A' }, { ...roles[0], id: 'b1', nameAr: 'دور ب', nameEn: 'B' }])),
      http.get('*/api/permission-targets/role-group', () => HttpResponse.json([{ id: 'g1', nameAr: 'فريق', nameEn: 'Team' }])),
      http.get('*/api/permission-targets/role-group/g1', () => HttpResponse.json({ ...role, kind: 'role-group', id: 'g1' })),
      http.get('*/api/role-groups', () => HttpResponse.json([group])),
      http.put('*/api/role-groups/g1', async ({ request }) => { saved.push(await request.json()); return HttpResponse.json(group); }),
    );
    renderPage(<PermissionsPage />);
    await chooseOption((await screen.findByLabelText('أضع الصلاحيات على')), 'role-group');
    await chooseOption(await screen.findByLabelText('مجموعة الأدوار'), 'g1');
    fireEvent.click(await screen.findByLabelText('إضافة دور إلى المجموعة'));
    const items = await waitFor(() => { const found = Array.from(document.querySelectorAll('[cmdk-item]')); if (found.length < 2) throw new Error('no roles'); return found; });
    fireEvent.click(items[0] as HTMLElement);
    fireEvent.click(items[1] as HTMLElement);
    expect(await screen.findByText('تم اختيار 2')).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    fireEvent.click(await screen.findByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(saved).toHaveLength(1));
    expect((saved[0] as { roleIds: string[] }).roleIds.sort()).toEqual(['a1', 'b1']);
  });

  it('lets a change of the fields alone be saved (FR-94)', async () => {
    const saved = serve(['permissions.view', 'permissions.role_update']);
    const withFields = { ...role, permissions: [{ key: 'employees.update', scope: 'own' as const, fields: ['profession'] }] };
    server.use(
      http.get('*/api/permissions/catalog', () => HttpResponse.json([{ module: 'employees', permissions: [{ key: 'employees.update', module: 'employees', labelAr: 'تعديل بيانات الموظفين', labelEn: 'Edit employees', scopes: ['own', 'all'] }] }])),
      http.get('*/api/permission-targets/role/r1', () => HttpResponse.json(withFields)),
    );
    renderPage(<PermissionsPage />);
    await chooseOption((await screen.findByLabelText('الدور')), 'r1');
    fireEvent.click(await screen.findByRole('button', { name: /الحقول التي يعدّلها/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'الآيبان' }));
    fireEvent.click(screen.getByRole('button', { name: 'تم' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'حفظ' })).toBeEnabled());
    expect(saved).toHaveLength(0);
  });

  it('lists people in the drop-down of «one person» without typing anything first, and searches on the server as you type (FR-47)', async () => {
    serve(['permissions.view']);
    const asked: string[] = [];
    server.use(http.get('*/api/permission-targets/user', ({ request }) => {
      asked.push(new URL(request.url).searchParams.get('q') ?? '');
      return HttpResponse.json([{ id: 'u1', nameAr: 'سارة مجدي', nameEn: 'Sara Magdy' }]);
    }));
    renderPage(<PermissionsPage />);
    await chooseOption((await screen.findByLabelText('أضع الصلاحيات على')), 'user');
    fireEvent.click(await screen.findByLabelText('الشخص'));
    expect(await screen.findByText('سارة مجدي')).toBeInTheDocument();
    expect(asked[0]).toBe('');
    fireEvent.change(await screen.findByPlaceholderText('ابحث…'), { target: { value: 'س' } });
    await waitFor(() => expect(asked).toContain('س'));
  });
});
