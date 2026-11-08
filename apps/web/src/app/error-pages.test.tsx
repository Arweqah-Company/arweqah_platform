import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { useQuery } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/core/api/api-client';
import { me, server } from '../../test/msw';
import { renderRoute } from '../../test/render';
import { NotFoundPage } from './not-found-page';
import { RouteErrorPage } from './route-error-page';
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

  it('500: a route that crashes shows the error page with reload and home, not the library screen', () => {
    const Boom = () => {
      throw new Error('boom');
    };
    renderRoute([{ path: '/boom', element: <Boom />, ErrorBoundary: RouteErrorPage }], '/boom');
    expect(screen.getByRole('heading', { level: 1, name: 'حدث خطأ غير متوقع' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إعادة تحميل الصفحة' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'الرئيسية' })).toHaveAttribute('href', '/');
  });

  it('500: a page whose data the server failed to give shows the 500 page; a 4xx stays the page\'s own business', async () => {
    const Page = ({ path }: { path: string }) => {
      const { data } = useQuery({ queryKey: [path], queryFn: () => apiClient.get<{ ok: boolean }>(path) });
      return <p>{data ? 'تم' : 'تحميل'}</p>;
    };
    const routes = (path: string) => [{ path: '/p', element: <RouteOutlet />, children: [{ index: true, element: <Page path={path} /> }] }];
    server.use(http.get('*/api/me', () => HttpResponse.json(me([]))));
    server.use(http.get('*/api/broken', () => HttpResponse.json({ code: 'internal', message: 'x' }, { status: 500 })));
    server.use(http.get('*/api/missing', () => HttpResponse.json({ code: 'not_found', message: 'x' }, { status: 404 })));
    const { unmount } = renderRoute(routes('/broken'), '/p');
    expect(await screen.findByRole('heading', { level: 1, name: 'حدث خطأ غير متوقع' })).toBeInTheDocument();
    unmount();
    let answered = false;
    server.use(http.get('*/api/missing', () => { answered = true; return HttpResponse.json({ code: 'not_found', message: 'x' }, { status: 404 }); }));
    renderRoute(routes('/missing'), '/p');
    await vi.waitFor(() => expect(answered).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('heading', { level: 1, name: 'حدث خطأ غير متوقع' })).not.toBeInTheDocument();
  });

  it('500: the page comes back when the query that failed answers well later (a refetch, a retry), without leaving the page', async () => {
    let healthy = false;
    server.use(http.get('*/api/me', () => HttpResponse.json(me([]))));
    server.use(http.get('*/api/flaky', () => (healthy ? HttpResponse.json({ ok: true }) : HttpResponse.json({ code: 'internal', message: 'x' }, { status: 500 }))));
    const Shell = () => {
      const { refetch } = useQuery({ queryKey: ['flaky'], queryFn: () => apiClient.get<{ ok: boolean }>('/flaky'), retry: false });
      return <><button onClick={() => { healthy = true; void refetch(); }}>إعادة</button><RouteOutlet /></>;
    };
    renderRoute([{ path: '/p', element: <Shell />, children: [{ index: true, element: <p>الصفحة</p> }] }], '/p');
    expect(await screen.findByRole('heading', { level: 1, name: 'حدث خطأ غير متوقع' })).toBeInTheDocument();
    screen.getByRole('button', { name: 'إعادة' }).click();
    expect(await screen.findByText('الصفحة')).toBeInTheDocument();
  });
});
