import { CorePermission, type NotificationDto } from '@arweqah-platform/shared';
import { CheckCheck, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { useListPage } from '@/shared/lib/use-list-page';
import { useServerList } from '@/shared/lib/use-server-list';
import { Can } from '@/core/permissions/can';
import { Button, DataTable, ListToolbar, PageHeader, RowAction, type FilterField } from '@/shared/ui';
import { useMarkRead } from './api/notifications.api';

export function NotificationsPage() {
  const { t, i18n } = useTranslation('notifications');
  const navigate = useNavigate();
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
        actions={<Can permission={CorePermission.NotificationsMarkRead}><Button variant="secondary" onClick={() => markRead.mutate('all')}>{t('markAll')}</Button></Can>}
      />
      <DataTable<NotificationDto>
        {...table}
        caption={t('title')}
        toolbar={<ListToolbar listKey="notifications" {...list.toolbar({ label: t('searchLabel'), placeholder: t('searchPlaceholder') }, fields)} actions={<ExchangeButtons permissions={{ export: CorePermission.NotificationsExport }} exporting={{ columns: exportColumns, filename: 'notifications', pageRows: query.data?.items ?? [], total: query.data?.total ?? 0, loadAll }} />} />}
        rowKey={(n) => n.id}
        onRowClick={(n) => {
          if (n.link?.startsWith('/')) {
            markRead.mutate([n.id]);
            navigate(n.link);
          }
        }}
        actions={(n) => (
          <>
            {n.link?.startsWith('/') && (
              <Button asChild variant="ghost" size="icon"><Link to={n.link} aria-label={t('open')} title={t('open')} onClick={() => markRead.mutate([n.id])}><ExternalLink className="size-5" aria-hidden /></Link></Button>
            )}
            {!n.readAt && <Can permission={CorePermission.NotificationsMarkRead}><RowAction label={t('markOne')} icon={CheckCheck} onClick={() => markRead.mutate([n.id])} /></Can>}
          </>
        )}
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
        ]}
      />
    </>
  );
}
