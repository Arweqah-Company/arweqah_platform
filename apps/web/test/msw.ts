import type { MeDto, PermissionCatalogGroup, RoleDto } from '@arweqah-platform/shared';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const me = (permissions: MeDto['permissions'] = []): MeDto => ({
  id: 'u1',
  name: 'سارة أحمد',
  email: 'sara@arweqah.sa',
  locale: 'ar',
  isActive: true,
  twoFactorEnabled: true,
  roles: [],
  placement: { branchId: null, departmentId: null, teamId: null, managerId: null },
  createdAt: new Date(0).toISOString(),
  permissions,
});

export const catalog: PermissionCatalogGroup[] = [
  {
    module: 'users',
    permissions: [
      { key: 'users.view', module: 'users', labelAr: 'عرض المستخدمين', labelEn: 'View users', scopes: ['team', 'department', 'branch', 'company'] },
    ],
  },
];

export const roles: RoleDto[] = [
  { id: 'r1', nameAr: 'مدير النظام', nameEn: 'System Admin', description: null, isSystem: true, permissions: [], usersCount: 1 },
];

/** Handlers shared by component tests; individual tests override with server.use(...). */
export const server = setupServer(
  http.get('*/api/me', () => HttpResponse.json(me())),
  http.get('*/api/notifications/unread-count', () => HttpResponse.json({ count: 3 })),
  http.get('*/api/permissions/catalog', () => HttpResponse.json(catalog)),
  http.get('*/api/roles', () => HttpResponse.json(roles)),
);
