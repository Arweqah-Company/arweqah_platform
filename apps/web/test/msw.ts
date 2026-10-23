import type { LookupsDto, MeDto, PermissionCatalogGroup, RoleDto } from '@arweqah-platform/shared';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const me = (permissions: MeDto['permissions'] = []): MeDto => ({
  id: 'u1',
  name: 'سارة أحمد',
  email: 'sara@arweqah.sa',
  locale: 'ar',
  theme: 'system',
  isActive: true,
  authenticatorEnabled: true,
  mfaVerified: true,
  adminMode: { available: false, active: false, expiresAt: null },
  roles: [],
  placement: { companyId: null, orgNodeId: null, managerId: null },
  createdAt: new Date(0).toISOString(),
  permissions,
});

export const catalog: PermissionCatalogGroup[] = [
  {
    module: 'employees',
    permissions: [
      { key: 'employees.view', module: 'employees', labelAr: 'عرض الموظفين', labelEn: 'View employees', scopes: ['own', 'unit', 'subtree', 'company', 'all'] },
    ],
  },
];

export const roles: RoleDto[] = [
  { id: 'r1', nameAr: 'مدير النظام', nameEn: 'System Admin', description: null, isSystem: true, permissions: [], usersCount: 1 },
];

const item = (code: string, nameAr: string, nameEn: string, sortOrder = 1) => ({ id: `id-${code}`, code, name: nameAr, nameAr, nameEn, sortOrder });

/** A small but realistic set of option lists, with the flags the employee form is built from. */
export const lookups: LookupsDto = {
  relationTypes: [item('employee', 'موظف', 'Employee')],
  countries: [{ ...item('SA', 'السعودية', 'Saudi Arabia'), isoCode: 'SA', currencyCode: 'SAR', currencyName: 'ريال سعودي' }],
  maritalStatuses: [item('married', 'متزوج', 'Married')],
  residencyStatuses: [item('citizen', 'مواطن', 'Citizen')],
  idTypes: [{ ...item('national_id', 'هوية وطنية', 'National ID'), requiresCountry: false, rules: [] }],
  contractTypes: [
    { ...item('fixed_term', 'محدد المدة', 'Fixed-Term'), requiresEndDate: true, isOther: false },
    { ...item('other', 'أخرى', 'Other', 2), requiresEndDate: false, isOther: true },
  ],
  gosiSystems: [item('new_system', 'النظام الجديد', 'New System')],
  terminationReasons: [{ ...item('resignation', 'استقالة', 'Resignation'), isOther: false }],
};

export const companyOptions = [{ id: 'company-1', code: 'ARW', nameAr: 'أروقة الريادة', nameEn: 'Arweqah Alreyadah' }];

/** Handlers shared by component tests; individual tests override with server.use(...). */
export const server = setupServer(
  http.get('*/api/me', () => HttpResponse.json(me())),
  http.get('*/api/permissions/catalog', () => HttpResponse.json(catalog)),
  http.get('*/api/roles', () => HttpResponse.json(roles)),
  http.get('*/api/lookups', () => HttpResponse.json(lookups)),
  http.get('*/api/lookups/companies', () => HttpResponse.json(companyOptions)),
);
