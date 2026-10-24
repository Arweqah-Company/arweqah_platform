import { CorePermission, type AuditLogDto } from '@arweqah-platform/shared';
import { Eye } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { useListPage } from '@/shared/lib/use-list-page';
import { useServerList } from '@/shared/lib/use-server-list';
import { DataTable, DetailsDialog, ListToolbar, PageHeader, RowAction, type FilterField } from '@/shared/ui';

export function AuditPage() {
  const { t, i18n } = useTranslation('audit');
  const { t: tc } = useTranslation();
  const [viewing, setViewing] = useState<AuditLogDto | null>(null);
  const list = useListPage('audit');
  const fields: FilterField[] = [
    { id: 'action', label: t('filters.action'), type: 'text', placeholder: 'user.created' },
    { id: 'entityType', label: t('filters.entityType'), type: 'text', placeholder: 'role' },
    { id: 'actor', label: t('filters.actor'), type: 'text' },
    { id: 'from', label: t('filters.from'), type: 'date' },
    { id: 'to', label: t('filters.to'), type: 'date' },
  ];
  const { query, loadAll, table } = useServerList<AuditLogDto>('audit', '/audit-logs', list, { search: list.term || undefined, ...list.filters.values });
  const when = (l: AuditLogDto) => new Date(l.createdAt).toLocaleString(i18n.language);
  const exportColumns: ExportColumn<AuditLogDto>[] = [
    { id: 'when', header: t('when'), value: when },
    { id: 'actor', header: t('actor'), value: (l) => l.actorName ?? t('system') },
    { id: 'action', header: t('action'), value: (l) => l.action },
    { id: 'entityType', header: t('filters.entityType'), value: (l) => l.entityType },
    { id: 'entityId', header: t('entityId'), value: (l) => l.entityId },
    { id: 'ip', header: t('ip'), value: (l) => l.ip },
  ];
  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <DataTable<AuditLogDto>
        listKey="audit"
        {...table}
        caption={t('title')}
        title={t('allTitle')}
        toolbar={<ListToolbar listKey="audit" {...list.toolbar({ label: t('searchLabel'), placeholder: t('searchPlaceholder'), dir: 'ltr' }, fields)} actions={<ExchangeButtons permissions={{ export: CorePermission.AuditExport }} exporting={{ columns: exportColumns, filename: 'audit-log', pageRows: query.data?.items ?? [], total: query.data?.total ?? 0, loadAll }} />} />}
        rowKey={(l) => l.id}
        onRowClick={setViewing}
        actions={(l) => <RowAction label={tc('actions.view')} icon={Eye} onClick={() => setViewing(l)} />}
        columns={[
          { id: 'when', header: t('when'), className: 'whitespace-nowrap text-muted', cell: when },
          { id: 'actor', header: t('actor'), cell: (l) => l.actorName ?? t('system') },
          { id: 'action', header: t('action'), cell: (l) => <code className="font-latin text-sm" dir="ltr">{l.action}</code> },
          { id: 'target', header: t('target'), cell: (l) => <span className="font-latin text-sm text-muted" dir="ltr">{l.entityType}{l.entityId ? ` ${l.entityId.slice(0, 8)}` : ''}</span> },
        ]}
      />
      {viewing && <AuditDetails entry={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}

/** One audit entry in full: who, what, on which record, from where, and what changed (never sensitive values: those are redacted when written). */
function AuditDetails({ entry: l, onClose }: { entry: AuditLogDto; onClose: () => void }) {
  const { t, i18n } = useTranslation('audit');
  const rows: [string, ReactNode][] = [
    [t('when'), new Date(l.createdAt).toLocaleString(i18n.language)],
    [t('actor'), l.actorName ?? t('system')],
    [t('action'), <code key="a" className="font-latin" dir="ltr">{l.action}</code>],
    [t('filters.entityType'), <span key="e" className="font-latin" dir="ltr">{l.entityType}</span>],
    [t('entityId'), <span key="i" className="font-latin" dir="ltr">{l.entityId ?? '—'}</span>],
    [t('ip'), <span key="p" className="font-latin" dir="ltr">{l.ip ?? '—'}</span>],
    [t('changes'), l.changes ? <pre key="c" className="max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-neutral-50 p-3 font-latin text-xs" dir="ltr">{JSON.stringify(l.changes, null, 2)}</pre> : '—'],
  ];
  return <DetailsDialog title={t('viewTitle')} description={l.action} rows={rows} onClose={onClose} />;
}
