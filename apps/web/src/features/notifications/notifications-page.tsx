import type { NotificationDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { useListPage } from '@/shared/lib/use-list-page';
import { useServerList } from '@/shared/lib/use-server-list';
import { Button, DataTable, ListToolbar, PageHeader, type FilterField } from '@/shared/ui';
import { useMarkRead } from './api/notifications.api';

export function NotificationsPage() {
  const { t, i18n } = useTranslation('notifications');
  const list = useListPage('notifications');
  const state = list.filters.values.state;
  const fields: FilterField[] = [
    { id: 'state', label: t('filters.state'), type: 'select', options: [{ value: 'unread', label: t('filters.unread') }, { value: 'read', label: t('filters.read') }] },
    { id: 'from', label: t('filters.from'), type: 'date' },
    { id: 'until', label: t('filters.until'), type: 'date' },
  ];
  const { query, loadAll, table } = useServerList<NotificationDto>('notifications', '/notifications', list, {
    search: list.term || undefined,
    unreadOnly: state === 'unread' || undefined,
    readOnly: state === 'read' || undefined,
    from: list.filters.get('from'),
    until: list.filters.get('until'),
  });
  const markRead = useMarkRead();
  const ar = i18n.language === 'ar';
  const exportColumns: ExportColumn<NotificationDto>[] = [
    { id: 'title', header: t('titleColumn'), value: (n) => (ar ? n.titleAr : n.titleEn) },
    { id: 'text', header: t('textColumn'), value: (n) => (ar ? n.bodyAr : n.bodyEn) },
    { id: 'when', header: t('whenColumn'), value: (n) => new Date(n.createdAt).toLocaleString(i18n.language) },
    { id: 'state', header: t('filters.state'), value: (n) => (n.readAt ? t('filters.read') : t('filters.unread')) },
  ];
  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={<Button variant="secondary" onClick={() => markRead.mutate('all')}>{t('markAll')}</Button>}
      />
      <DataTable<NotificationDto>
        {...table}
        caption={t('title')}
        toolbar={<ListToolbar {...list.toolbar({ label: t('searchLabel'), placeholder: t('searchPlaceholder') }, fields)} actions={<ExchangeButtons exporting={{ columns: exportColumns, filename: 'notifications', pageRows: query.data?.items ?? [], total: query.data?.total ?? 0, loadAll }} />} />}
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
                <Link className="text-sm text-link underline-offset-4 hover:underline" to={n.link} onClick={() => markRead.mutate([n.id])}>
                  {t('open')}
                </Link>
              ) : null,
          },
        ]}
      />
    </>
  );
}
