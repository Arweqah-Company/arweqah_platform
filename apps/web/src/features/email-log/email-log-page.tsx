import { CorePermission, EMAIL_PURPOSES, EMAIL_STATUSES, type EmailLogDto } from '@arweqah-platform/shared';
import { Eye } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { useListPage } from '@/shared/lib/use-list-page';
import { useServerList } from '@/shared/lib/use-server-list';
import { Badge, DataTable, DetailsDialog, ListToolbar, PageHeader, RowAction, type FilterField } from '@/shared/ui';

const statusTone = { sent: 'success', failed: 'danger', pending: 'neutral' } as const;

export function EmailLogPage() {
  const { t, i18n } = useTranslation('emailLog');
  const { t: tc } = useTranslation();
  const [viewing, setViewing] = useState<EmailLogDto | null>(null);
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
        onRowClick={setViewing}
        actions={(l) => <RowAction label={tc('actions.view')} icon={Eye} onClick={() => setViewing(l)} />}
        columns={[
          { id: 'when', header: t('when'), className: 'whitespace-nowrap text-muted', cell: when },
          { id: 'to', header: t('to'), cell: (l) => <span className="font-latin text-sm" dir="ltr">{l.to}</span> },
          { id: 'subject', header: t('subject'), cell: (l) => l.subject },
          { id: 'purpose', header: t('purpose'), cell: (l) => t(`purposes.${l.purpose}`) },
          { id: 'status', header: t('status'), cell: (l) => <Badge tone={statusTone[l.status]}>{t(`statuses.${l.status}`)}</Badge> },
          { id: 'details', header: t('details'), cell: (l) => <span className="font-latin text-sm text-muted" dir="ltr">{l.error ?? l.providerResponse ?? ''}</span> },
        ]}
      />
      {viewing && <EmailDetails entry={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}

/** One sent e-mail in full: to whom, why, how it went and what the mail server answered (never the body: it holds one-time links). */
function EmailDetails({ entry: l, onClose }: { entry: EmailLogDto; onClose: () => void }) {
  const { t, i18n } = useTranslation('emailLog');
  const day = (iso: string | null) => (iso ? new Date(iso).toLocaleString(i18n.language) : '—');
  const rows: [string, ReactNode][] = [
    [t('when'), day(l.createdAt)],
    [t('sentAt'), day(l.sentAt)],
    [t('to'), <span key="t" className="font-latin" dir="ltr">{l.to}</span>],
    [t('subject'), l.subject],
    [t('purpose'), t(`purposes.${l.purpose}`)],
    [t('status'), t(`statuses.${l.status}`)],
    [t('error'), <span key="e" className="font-latin" dir="ltr">{l.error ?? '—'}</span>],
    [t('response'), <span key="r" className="font-latin" dir="ltr">{l.providerResponse ?? '—'}</span>],
  ];
  return <DetailsDialog title={t('viewTitle')} description={l.subject} rows={rows} onClose={onClose} />;
}
