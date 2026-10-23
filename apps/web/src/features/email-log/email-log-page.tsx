import { CorePermission, EMAIL_PURPOSES, EMAIL_STATUSES, type EmailLogDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { useListPage } from '@/shared/lib/use-list-page';
import { useServerList } from '@/shared/lib/use-server-list';
import { Badge, DataTable, ListToolbar, PageHeader, type FilterField } from '@/shared/ui';

const statusTone = { sent: 'success', failed: 'danger', pending: 'neutral' } as const;

export function EmailLogPage() {
  const { t, i18n } = useTranslation('emailLog');
  const list = useListPage('email-log');
  const fields: FilterField[] = [
    { id: 'status', label: t('status'), type: 'select', options: EMAIL_STATUSES.map((s) => ({ value: s, label: t(`statuses.${s}`) })) },
    { id: 'purpose', label: t('purpose'), type: 'select', options: EMAIL_PURPOSES.map((p) => ({ value: p, label: t(`purposes.${p}`) })) },
    { id: 'to', label: t('filterTo'), type: 'text', placeholder: 'name@arweqah.sa' },
    { id: 'from', label: t('filters.from'), type: 'date' },
    { id: 'until', label: t('filters.until'), type: 'date' },
  ];
  const { query, loadAll, table } = useServerList<EmailLogDto>('email-logs', '/email-logs', list, { search: list.term || undefined, ...list.filters.values });
  const when = (l: EmailLogDto) => new Date(l.createdAt).toLocaleString(i18n.language);
  const exportColumns: ExportColumn<EmailLogDto>[] = [
    { id: 'when', header: t('when'), value: when },
    { id: 'to', header: t('to'), value: (l) => l.to },
    { id: 'subject', header: t('subject'), value: (l) => l.subject },
    { id: 'purpose', header: t('purpose'), value: (l) => t(`purposes.${l.purpose}`) },
    { id: 'status', header: t('status'), value: (l) => t(`statuses.${l.status}`) },
    { id: 'details', header: t('details'), value: (l) => l.error ?? l.providerResponse },
  ];
  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <DataTable<EmailLogDto>
        listKey="email-log"
        {...table}
        caption={t('title')}
        title={t('allTitle')}
        toolbar={<ListToolbar listKey="email-log" {...list.toolbar({ label: t('searchLabel'), placeholder: t('searchPlaceholder') }, fields)} actions={<ExchangeButtons permissions={{ export: CorePermission.EmailLogExport }} exporting={{ columns: exportColumns, filename: 'email-log', pageRows: query.data?.items ?? [], total: query.data?.total ?? 0, loadAll }} />} />}
        rowKey={(l) => l.id}
        columns={[
          { id: 'when', header: t('when'), className: 'whitespace-nowrap text-muted', cell: when },
          { id: 'to', header: t('to'), cell: (l) => <span className="font-latin text-sm" dir="ltr">{l.to}</span> },
          { id: 'subject', header: t('subject'), cell: (l) => l.subject },
          { id: 'purpose', header: t('purpose'), cell: (l) => t(`purposes.${l.purpose}`) },
          { id: 'status', header: t('status'), cell: (l) => <Badge tone={statusTone[l.status]}>{t(`statuses.${l.status}`)}</Badge> },
          { id: 'details', header: t('details'), cell: (l) => <span className="font-latin text-sm text-muted" dir="ltr">{l.error ?? l.providerResponse ?? ''}</span> },
        ]}
      />
    </>
  );
}
