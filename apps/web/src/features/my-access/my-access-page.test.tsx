import type { MyAccessDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { MyAccessPage } from './my-access-page';

type Grant = MyAccessDto['grants'][number];
const grant = (g: Omit<Grant, 'sources'> & { source: string }): Grant => ({ ...g, sources: [{ kind: 'role', nameAr: g.source, nameEn: g.source }] });

const data = (over: Partial<MyAccessDto> = {}): MyAccessDto => ({
  roles: [{ id: 'r1', nameAr: 'موظف', nameEn: 'Employee', assignment: 'auto' }],
  grants: [
    grant({ key: 'tasks.view', module: 'tasks', labelAr: 'عرض المهام', labelEn: 'View tasks', scope: 'own', source: 'موظف' }),
    grant({ key: 'employees.view', module: 'employees', labelAr: 'عرض الموظفين', labelEn: 'View employees', scope: 'company', source: 'مدير الموارد' }),
  ],
  adminRolesHidden: false,
  ...over,
});

function open(body: MyAccessDto) {
  server.use(http.get('*/api/me', () => HttpResponse.json(me([{ key: 'my_access.view', scope: 'all' }]))), http.get('*/api/me/access', () => HttpResponse.json(body)));
  renderPage(<MyAccessPage />);
}

describe('My access page (FR-88)', () => {
  it('shows my roles and every permission with its reach and where it comes from', async () => {
    open(data());
    expect(await screen.findByText('عرض المهام')).toBeInTheDocument();
    expect(screen.getByText(/موظف · تلقائي من النظام/)).toBeInTheDocument();
    const row = screen.getByText('عرض الموظفين').closest('tr') as HTMLElement;
    expect(within(row).getByText('مدير الموارد')).toBeInTheDocument();
    expect(screen.queryByText(/مخفية إلى أن تفعّل/)).not.toBeInTheDocument();
  });

  it('searches the permissions', async () => {
    open(data());
    fireEvent.change(await screen.findByRole('searchbox', { name: 'البحث في صلاحياتي' }), { target: { value: 'الموظفين' } });
    expect(await screen.findByText('عرض الموظفين')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('عرض المهام')).not.toBeInTheDocument());
  });

  it('says that the administrative permissions wait for admin mode, without naming them', async () => {
    open(data({ adminRolesHidden: true }));
    expect(await screen.findByText(/صلاحيات دورك الإداري مخفية إلى أن تفعّل وضع مدير المنصة/)).toBeInTheDocument();
  });
});
