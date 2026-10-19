import type { NotificationDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button, DataTable, PageHeader } from '@/shared/ui';
import { useMarkRead, useNotifications } from './api/notifications.api';

export function NotificationsPage() {
  const { t, i18n } = useTranslation('notifications');
  const [page, setPage] = useState(1);
  const list = useNotifications(page);
  const markRead = useMarkRead();
  const ar = i18n.language === 'ar';
  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={<Button variant="secondary" onClick={() => markRead.mutate('all')}>{t('markAll')}</Button>}
      />
      <DataTable<NotificationDto>
        caption={t('title')}
        rows={list.data?.items}
        page={list.data}
        onPageChange={setPage}
        isLoading={list.isPending}
        error={list.error}
        rowKey={(n) => n.id}
        empty={t('empty')}
        columns={[
          {
            id: 'content',
            header: t('title'),
            cell: (n) => (
              <div className={n.readAt ? 'text-muted' : 'font-medium'}>
                <p>{ar ? n.titleAr : n.titleEn}</p>
                <p className="text-sm font-normal text-muted">{ar ? n.bodyAr : n.bodyEn}</p>
              </div>
            ),
          },
          { id: 'date', header: 'date', hideHeader: true, className: 'w-40 whitespace-nowrap text-sm text-muted', cell: (n) => new Date(n.createdAt).toLocaleString(i18n.language) },
          {
            id: 'open',
            header: t('open'),
            hideHeader: true,
            className: 'w-24',
            cell: (n) =>
              n.link?.startsWith('/') ? (
                <Link className="text-sm text-navy-700 underline-offset-4 hover:underline" to={n.link} onClick={() => markRead.mutate([n.id])}>
                  {t('open')}
                </Link>
              ) : null,
          },
        ]}
      />
    </>
  );
}
