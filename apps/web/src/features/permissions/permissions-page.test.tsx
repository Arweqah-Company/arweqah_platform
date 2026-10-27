import type { PermissionTargetDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { catalog, me, server } from '../../../test/msw';
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
  it('places permissions on a role: choose the kind and the role, tick, save', async () => {
    const saved = serve(['permissions.view', 'permissions.role_update']);
    renderPage(<PermissionsPage />);
    expect(await screen.findByLabelText('أضع الصلاحيات على')).toHaveTextContent('دور');
    await chooseOption((await screen.findByLabelText('الدور')), 'r1');
    const box = await screen.findByRole('checkbox', { name: 'عرض الموظفين' });
    const save = screen.getByRole('button', { name: 'حفظ' });
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
