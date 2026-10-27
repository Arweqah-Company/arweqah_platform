import { CorePermission as P, type NotificationDto } from '@arweqah-platform/shared';
import { fireEvent, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderRoute } from '../../../test/render';
import { NotificationBell } from './notification-bell';

const note = (over: Partial<NotificationDto>): NotificationDto => ({ id: 'n1', titleAr: 'مهمة جديدة', titleEn: 'New task', bodyAr: 'نص', bodyEn: 'Body', link: '/tasks', readAt: null, createdAt: '2026-10-27T08:00:00Z', ...over });

function serve(items: NotificationDto[]) {
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me([P.NotificationsView, P.NotificationsMarkRead].map((key) => ({ key, scope: 'all' as const }))))),
    http.get('*/api/notifications/unread-count', () => HttpResponse.json({ count: 2 })),
    http.get('*/api/notifications', () => HttpResponse.json({ items, total: items.length, page: 1, pageSize: 5 })),
  );
}

describe('Notification bell (FR-61)', () => {
  it('opens a drop-down with the newest notifications and a link to the whole page, instead of jumping to it', async () => {
    serve([note({}), note({ id: 'n2', titleAr: 'تذكرة', link: null, readAt: '2026-10-27T09:00:00Z' })]);
    renderRoute([{ path: '/', element: <NotificationBell /> }, { path: '/notifications', element: <p>full page</p> }]);
    fireEvent.click(await screen.findByRole('button', { name: /غير مقروء/ }));
    expect(await screen.findByText('مهمة جديدة')).toBeInTheDocument();
    expect(screen.getByText('تذكرة')).toBeInTheDocument();
    expect(screen.queryByText('full page')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'عرض كل الإشعارات' }));
    expect(await screen.findByText('full page')).toBeInTheDocument();
  });

  it('says so when there are no notifications', async () => {
    serve([]);
    renderRoute([{ path: '/', element: <NotificationBell /> }]);
    fireEvent.click(await screen.findByRole('button', { name: /غير مقروء/ }));
    expect(await screen.findByText('لا توجد إشعارات بعد.')).toBeInTheDocument();
  });
});
