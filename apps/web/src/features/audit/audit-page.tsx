import { formatDateTime } from '@/shared/lib/format-date';
import { actionsOfCategory, AUDIT_ACTIONS, AUDIT_CATEGORIES, AUDIT_CATEGORY_LABELS, auditActionText, CorePermission, type AuditCategory, type AuditDetailDto, type AuditLogDto } from '@arweqah-platform/shared';
import { Eye } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, DataTable, DetailsDialog, ListToolbar, PageHeader, RowAction, Tabs, type FilterField } from '@/shared/ui';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { useListPage } from '@/shared/lib/use-list-page';
import { useServerList } from '@/shared/lib/use-server-list';

type Lang = 'ar' | 'en';

/** One tab per module (the category of its actions) over the same table of the same records: a tab only narrows what is shown, nothing is stored apart. */
const ALL_TAB = 'all';

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
    { id: 'action', label: t('action'), type: 'select', options: actionOptions(list.filters.values.category, lang) },
    { id: 'actor', label: t('filters.actor'), type: 'text' },
    { id: 'from', label: t('filters.from'), type: 'date' },
    { id: 'to', label: t('filters.to'), type: 'date' },
  ];
  const { query, loadAll, table } = useServerList<AuditLogDto>('audit', '/audit-logs', list, { search: list.term || undefined, ...list.filters.values });
  const when = (l: AuditLogDto) => formatDateTime(l.createdAt);
  const what = (l: AuditLogDto) => auditActionText(l.action, lang);
  const kind = (l: AuditLogDto) => AUDIT_CATEGORY_LABELS[l.category][lang];
  const exportColumns: ExportColumn<AuditLogDto>[] = [
    { id: 'when', header: t('when'), value: when },
    { id: 'actor', header: t('actor'), value: (l) => l.actorName ?? t('system') },
    { id: 'category', header: t('category'), value: kind },
    { id: 'action', header: t('action'), value: what },
    { id: 'record', header: t('record'), value: (l) => l.entityName?.[lang] ?? '' },
    { id: 'details', header: t('changes'), value: (l) => (l.details ?? []).map((d) => `${d.label[lang]}: ${d.value[lang]}`).join(' | ') },
    { id: 'ip', header: t('ip'), value: (l) => l.ip },
    { id: 'city', header: t('city'), value: (l) => l.ipCity?.[lang] ?? '' },
  ];
  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <Tabs
        label={t('tabsLabel')}
        value={list.filters.values.category ?? ALL_TAB}
        tabs={[{ id: ALL_TAB, label: t('allTab') }, ...AUDIT_CATEGORIES.map((c) => ({ id: c as string, label: AUDIT_CATEGORY_LABELS[c][lang] }))]}
        onChange={(id) => list.filters.set({ ...list.filters.values, category: id === ALL_TAB ? '' : id, action: '' })}
      />
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
          { id: 'record', header: t('record'), cell: (l) => l.entityName?.[lang] ?? '—' },
          { id: 'ip', header: t('ip'), className: 'whitespace-nowrap', cell: (l) => <span className="font-latin" dir="ltr">{l.ip ?? '—'}</span> },
          { id: 'city', header: t('city'), cell: (l) => l.ipCity?.[lang] ?? '—' },
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
    [t('when'), formatDateTime(l.createdAt)],
    [t('actor'), l.actorName ?? t('system')],
    [t('category'), AUDIT_CATEGORY_LABELS[l.category][lang]],
    [t('action'), auditActionText(l.action, lang)],
    [t('ip'), <span key="p" className="font-latin" dir="ltr">{l.ip ?? '—'}</span>],
    [t('city'), l.ipCity?.[lang] ?? '—'],
    ...(l.entityName ? ([[t('record'), l.entityName[lang]]] as [string, ReactNode][]) : []),
    [t('changes'), l.details?.length ? <ChangesList key="c" details={l.details} lang={lang} /> : '—'],
    ...(l.changes ? ([[t('technical'), <pre key="j" className="max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-neutral-50 p-3 font-latin text-xs" dir="ltr">{JSON.stringify(l.changes, null, 2)}</pre>]] as [string, ReactNode][]) : []),
  ];
  return <DetailsDialog title={t('viewTitle')} description={auditActionText(l.action, lang)} rows={rows} onClose={onClose} />;
}

/** What changed, one line per key: a label a person knows and the names behind the ids. */
function ChangesList({ details, lang }: { details: AuditDetailDto[]; lang: Lang }) {
  return (
    <dl className="flex flex-col gap-2">
      {details.map((d) => (
        <div key={d.label.en} className="rounded-xl bg-neutral-50 p-3">
          <dt className="text-xs text-muted">{d.label[lang]}</dt>
          <dd className="text-sm text-fg">{d.value[lang]}</dd>
        </div>
      ))}
    </dl>
  );
}
