import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../test/msw';
import { renderRoute } from '../../test/render';
import { NotFoundPage } from './not-found-page';
import { RouteOutlet } from './route-outlet';
import { SessionEndedPage } from './session-ended-page';

describe('Error pages: 401, 403, 404 (FR-30)', () => {
  it('404: says the page does not exist and offers a way back and home', () => {
    renderRoute([{ path: '/nowhere', element: <NotFoundPage /> }], '/nowhere');
    expect(screen.getByRole('heading', { level: 1, name: 'نأسف على إبلاغك بأن هذه الصفحة غير موجودة' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'رجوع' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'الرئيسية' })).toHaveAttribute('href', '/');
  });

  it('401: says the session ended and sends to sign-in', () => {
    renderRoute([{ path: '/401', element: <SessionEndedPage /> }], '/401');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('انتهت جلستك');
    expect(screen.getByRole('link', { name: 'تسجيل الدخول' })).toHaveAttribute('href', '/login');
  });

  it('403: a route that needs a permission shows the 403 page without it, and the page with it', async () => {
    const routes = [{ path: '/roles', handle: { permission: 'roles.view' }, element: <RouteOutlet />, children: [{ index: true, element: <p>الأدوار</p> }] }];
    server.use(http.get('*/api/me', () => HttpResponse.json(me([]))));
    const { unmount } = renderRoute(routes, '/roles');
    expect(await screen.findByRole('heading', { level: 1, name: 'ليس لديك صلاحية للدخول إلى هذه الصفحة' })).toBeInTheDocument();
    expect(screen.queryByText('الأدوار')).not.toBeInTheDocument();
    unmount();
    server.use(http.get('*/api/me', () => HttpResponse.json(me([{ key: 'roles.view', scope: 'all' }]))));
    renderRoute(routes, '/roles');
    expect(await screen.findByText('الأدوار')).toBeInTheDocument();
  });
});
