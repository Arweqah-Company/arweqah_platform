import { chooseOption } from '../../../test/select';
import type { PageVisibilityDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { PageVisibilityPage } from './page-visibility-page';

const overview: PageVisibilityDto = {
  pages: ['employees', 'org', 'companies'],
  roles: [
    { id: 'r1', nameAr: 'موظف', nameEn: 'Employee', locked: false, hiddenPages: ['org'] },
    { id: 'r2', nameAr: 'مدير النظام', nameEn: 'System Admin', locked: true, hiddenPages: [] },
  ],
};

function serve() {
  const saved: unknown[] = [];
  server.use(
    http.get('*/api/me', () => HttpResponse.json({ ...me([{ key: 'pages.view', scope: 'all' }, { key: 'pages.manage', scope: 'all' }]), adminMode: { available: true, active: true, expiresAt: null } })),
    http.get('*/api/page-visibility', () => HttpResponse.json(overview)),
    http.put('*/api/page-visibility/roles/r1', async ({ request }) => {
      saved.push(await request.json());
      return HttpResponse.json({ ...overview.roles[0] });
    }),
  );
  return saved;
}

describe('Page visibility page (FR-42)', () => {
  it('shows the pages of a role, saves what was unchecked, and locks a role that manages pages', async () => {
    const saved = serve();
    renderPage(<PageVisibilityPage />);
    expect(await screen.findByRole('checkbox', { name: 'الموظفون' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'الهيكل التنظيمي' })).not.toBeChecked();
    const save = screen.getByRole('button', { name: 'حفظ' });
    expect(save).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'الموظفون' }));
    fireEvent.click(save);
    await waitFor(() => expect(saved).toEqual([{ hiddenPages: ['org', 'employees'] }]));

    await chooseOption(screen.getByLabelText('الدور'), 'r2');
    expect(await screen.findByText(/هذا الدور يدير ظهور الصفحات/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'الموظفون' })).toBeDisabled();
  });
});
