import { fireEvent, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
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
