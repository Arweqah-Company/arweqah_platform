import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../test/msw';
import { renderRoute } from '../../test/render';
import { AppLayout } from './app-layout';

describe('AppLayout navigation', () => {
  it('shows only the sections the user has permission for', async () => {
    server.use(http.get('*/api/me', () => HttpResponse.json(me([{ key: 'users.view', scope: 'department' }]))));
    renderRoute([{ path: '/', element: <AppLayout />, children: [{ index: true, element: <p>home</p> }] }]);
    expect(await screen.findByRole('link', { name: 'المستخدمون' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'الأدوار والصلاحيات' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'سجل التدقيق' })).not.toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'الإشعارات، 3 غير مقروءة' })).toBeInTheDocument();
  });
});
