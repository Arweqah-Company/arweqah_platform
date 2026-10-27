import { actionsOfCategory, AUDIT_ACTIONS, AUDIT_CATEGORIES, AUDIT_CATEGORY_LABELS, auditActionText, CorePermission, type AuditCategory, type AuditLogDto } from '@arweqah-platform/shared';
import { Eye } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, DataTable, DetailsDialog, ListToolbar, PageHeader, RowAction, type FilterField } from '@/shared/ui';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { useListPage } from '@/shared/lib/use-list-page';
import { useServerList } from '@/shared/lib/use-server-list';

type Lang = 'ar' | 'en';

/** The action filter lists what a person reads, only the actions of the chosen category (all of them when none is chosen). */
function actionOptions(category: string | undefined, lang: Lang) {
  const keys = category ? actionsOfCategory(category as AuditCategory) : Object.keys(AUDIT_ACTIONS);
  return keys.map((value) => ({ value, label: auditActionText(value, lang) }));
}

export function AuditPage() {
  const { t, i18n } = useTranslation('audit');
  const { t: tc } = useTranslation();
  const lang: Lang = i18n.language === 'ar' ? 'ar' : 'en';
  const [viewing, setViewing] = useState<AuditLogDto | null>(null);
  const list = useListPage('audit');
  const fields: FilterField[] = [
    { id: 'category', label: t('category'), type: 'select', options: AUDIT_CATEGORIES.map((c) => ({ value: c, label: AUDIT_CATEGORY_LABELS[c][lang] })) },
    { id: 'action', label: t('action'), type: 'select', options: actionOptions(list.filters.values.category, lang) },
    { id: 'actor', label: t('filters.actor'), type: 'text' },
    { id: 'from', label: t('filters.from'), type: 'date' },
    { id: 'to', label: t('filters.to'), type: 'date' },
  ];
  const { query, loadAll, table } = useServerList<AuditLogDto>('audit', '/audit-logs', list, { search: list.term || undefined, ...list.filters.values });
  const when = (l: AuditLogDto) => new Date(l.createdAt).toLocaleString(i18n.language);
  const what = (l: AuditLogDto) => auditActionText(l.action, lang);
  const kind = (l: AuditLogDto) => AUDIT_CATEGORY_LABELS[l.category][lang];
  const exportColumns: ExportColumn<AuditLogDto>[] = [
    { id: 'when', header: t('when'), value: when },
    { id: 'actor', header: t('actor'), value: (l) => l.actorName ?? t('system') },
    { id: 'category', header: t('category'), value: kind },
    { id: 'action', header: t('action'), value: what },
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
        toolbar={<ListToolbar listKey="audit" {...list.toolbar({ label: t('searchLabel'), placeholder: t('searchPlaceholder') }, fields)} actions={<ExchangeButtons permissions={{ export: CorePermission.AuditExport }} exporting={{ columns: exportColumns, filename: 'audit-log', pageRows: query.data?.items ?? [], total: query.data?.total ?? 0, loadAll }} />} />}
        rowKey={(l) => l.id}
        onRowClick={setViewing}
        actions={(l) => <RowAction label={tc('actions.view')} icon={Eye} onClick={() => setViewing(l)} />}
        columns={[
          { id: 'when', header: t('when'), className: 'whitespace-nowrap text-muted', cell: when },
          { id: 'actor', header: t('actor'), cell: (l) => l.actorName ?? t('system') },
          { id: 'category', header: t('category'), cell: (l) => <Badge tone="neutral">{kind(l)}</Badge> },
          { id: 'action', header: t('action'), cell: what },
        ]}
      />
      {viewing && <AuditDetails entry={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}

/** One audit entry in full: who, what, on which record, from where, and what changed (never sensitive values: those are redacted when written). */
function AuditDetails({ entry: l, onClose }: { entry: AuditLogDto; onClose: () => void }) {
  const { t, i18n } = useTranslation('audit');
  const lang: Lang = i18n.language === 'ar' ? 'ar' : 'en';
  const rows: [string, ReactNode][] = [
    [t('when'), new Date(l.createdAt).toLocaleString(i18n.language)],
    [t('actor'), l.actorName ?? t('system')],
    [t('category'), AUDIT_CATEGORY_LABELS[l.category][lang]],
    [t('action'), auditActionText(l.action, lang)],
    [t('ip'), <span key="p" className="font-latin" dir="ltr">{l.ip ?? '—'}</span>],
    [t('changes'), l.changes ? <pre key="c" className="max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-neutral-50 p-3 font-latin text-xs" dir="ltr">{JSON.stringify(l.changes, null, 2)}</pre> : '—'],
  ];
  return <DetailsDialog title={t('viewTitle')} description={auditActionText(l.action, lang)} rows={rows} onClose={onClose} />;
}
