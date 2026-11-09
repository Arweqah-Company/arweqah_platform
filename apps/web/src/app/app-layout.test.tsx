import { CorePermission } from '@arweqah-platform/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { myCareer } from '../../test/career-fixtures';
import { me, server } from '../../test/msw';
import { renderRoute } from '../../test/render';
import { AppLayout } from './app-layout';

const open = (hiddenPages: string[] = []) => {
  server.use(http.get('*/api/me', () => HttpResponse.json({ ...me([{ key: 'employees.view', scope: 'all' }]), hiddenPages })));
  renderRoute([{ path: '/', element: <AppLayout />, children: [{ index: true, element: <p>home</p> }] }]);
};

describe('AppLayout navigation', () => {
  it('shows the sections in the sidebar and keeps "My account" in the menu under the name in the header', async () => {
    open();
    expect(await screen.findByRole('link', { name: 'الرئيسية' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'حسابي' })).toBeInTheDocument();
    // The account pages are no longer in the sidebar…
    expect(screen.queryByRole('link', { name: 'الأمان' })).not.toBeInTheDocument();
    // …they open from the header menu.
    fireEvent.keyDown(screen.getByRole('button', { name: 'حسابي' }), { key: 'Enter' });
    expect(await screen.findByRole('menuitem', { name: 'الأمان' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'الملف الشخصي' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'الإشعارات' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'تسجيل الخروج' })).toBeInTheDocument();
  });

  it('ends the header with the account menu, which alone holds sign-out', async () => {
    open();
    const header = await screen.findByRole('banner');
    await screen.findByRole('button', { name: 'حسابي' });
    expect(within(header).queryByRole('button', { name: 'تسجيل الخروج' })).not.toBeInTheDocument();
    const buttons = within(header).getAllByRole('button');
    expect(buttons[buttons.length - 1]).toHaveAccessibleName('حسابي');
  });

  it('leaves a page out of the menu while it is hidden from the person', async () => {
    open(['employees']);
    await screen.findByRole('link', { name: 'الرئيسية' });
    expect(screen.queryByRole('link', { name: 'الموظفون' })).not.toBeInTheDocument();
  });

  it('shows a page that is not hidden', async () => {
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'الموارد البشرية' }));
    expect(await screen.findByRole('link', { name: 'الموظفون' })).toBeInTheDocument();
  });
});

describe('The career path in the sidebar and the hold of the acknowledgement (FR-111, FR-112)', () => {
  const serve = (ackRequired: boolean) => {
    const keys = [CorePermission.CareerProfileView, CorePermission.EmployeesView].map((key) => ({ key, scope: 'all' as const }));
    server.use(
      http.get('*/api/me', () => HttpResponse.json(me(keys))),
      http.get('*/api/career-profile/me', () => HttpResponse.json(myCareer({ ackRequired }))),
    );
    renderRoute([{ path: '/', element: <AppLayout />, children: [{ index: true, element: <p>home</p> }, { path: 'career-profile', element: <p>career path page</p> }] }]);
  };

  it('puts «My career path» on its own, right under Home and outside the HR menu', async () => {
    serve(false);
    const home = await screen.findByRole('link', { name: 'الرئيسية' });
    const path = await screen.findByRole('link', { name: 'المسار الوظيفي' });
    const links = within(home.closest('ul') as HTMLElement).getAllByRole('link');
    expect(links.map((l) => l.textContent).slice(0, 2)).toEqual(['الرئيسية', 'المسار الوظيفي']);
    expect(path.closest('ul')?.id ?? '').not.toMatch(/^menu-/);
  });

  it('locks every entry of the sidebar while the acknowledgement is pending: nothing to click, and it says why', async () => {
    serve(true);
    expect(await screen.findByText('القائمة مغلقة حتى تُقرّ بمسارك الوظيفي.')).toBeInTheDocument();
    const nav = screen.getByRole('navigation');
    expect(within(nav).queryAllByRole('link')).toHaveLength(0);
    for (const button of within(nav).getAllByRole('button')) expect(button).toBeDisabled();
    expect(within(nav).getByRole('button', { name: 'الرئيسية' })).toBeDisabled();
    expect(within(nav).getByRole('button', { name: 'المسار الوظيفي' })).toBeDisabled();
  });

  it('opens the sidebar again once the acknowledgement is made', async () => {
    serve(false);
    expect(await screen.findByRole('link', { name: 'المسار الوظيفي' })).toBeInTheDocument();
    expect(screen.queryByText('القائمة مغلقة حتى تُقرّ بمسارك الوظيفي.')).not.toBeInTheDocument();
  });
});

