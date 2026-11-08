import { CorePermission, type CareerTitleListItemDto } from '@arweqah-platform/shared';
import { Route } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import { useListPage, type ListPage } from '@/shared/lib/use-list-page';
import { useServerList } from '@/shared/lib/use-server-list';
import { Button, ConfirmDialog, EmptyState, ListToolbar, ListToolbarPanel, PageHeader } from '@/shared/ui';
import { useContentColumns } from './content-columns';
import { toContentQuery, useContentFilterFields } from './content-filters';
import { useLearningLinksImport } from './learning-links-import';
import { TitleDialogs, type TitleDialogState } from './title-dialogs';
import { TitleList } from './title-list';
import { TitlePanel } from './title-panel';

type Paged = { total: number; page: number; pageSize: number; onPage: (page: number) => void };

/** Previous / next page of the titles, when there is more than one page. */
function Pager({ total, page, pageSize, onPage }: Paged) {
  const { t } = useTranslation('career-profile');
  if (total <= pageSize) return null;
  return (
    <div className="flex items-center justify-between border-t border-neutral-200 p-2 text-sm">
      <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>{t('content.previousPage')}</Button>
      <span className="text-muted">{page} / {Math.ceil(total / pageSize)}</span>
      <Button variant="ghost" size="sm" disabled={page * pageSize >= total} onClick={() => onPage(page + 1)}>{t('content.nextPage')}</Button>
    </div>
  );
}

/** Search and filters above the titles, then the titles with their pages. */
function TitlesColumn({ list, rows, query, selectedId, onSelect }: { list: ListPage; rows: CareerTitleListItemDto[]; query: { isPending: boolean; isError: boolean; data?: { total: number } }; selectedId: string | undefined; onSelect: (id: string) => void }) {
  const { t } = useTranslation('career-profile');
  const fields = useContentFilterFields();
  const empty = rows.length === 0 && !query.isPending && !query.isError;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <ListToolbarPanel><ListToolbar listKey="career-content" {...list.toolbar({ label: t('content.searchLabel'), placeholder: t('content.searchPlaceholder') }, fields, false)} /></ListToolbarPanel>
      <div className="rounded-3xl border border-neutral-200 bg-white shadow-sm shadow-ink/5">
        {query.isError && <p role="alert" className="p-4 text-danger">{t('content.loadFailed')}</p>}
        {empty && <EmptyState icon={Route} title={list.narrowed ? t('content.noMatches') : t('content.empty')} />}
        <TitleList items={rows} selectedId={selectedId} onSelect={onSelect} />
        <Pager total={query.data?.total ?? 0} page={list.page} pageSize={list.pageSize} onPage={list.setPage} />
      </div>
    </div>
  );
}

/**
 * Which title is open, and the question before another one replaces a panel that holds unsaved edits. The open title is kept apart from the
 * results: a search, a filter or a reload that no longer lists it does not close its panel while it holds edits (the list still refreshes it when it is there).
 */
function useOpenTitle(rows: CareerTitleListItemDto[]) {
  const [current, setCurrent] = useState<CareerTitleListItemDto>();
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState<CareerTitleListItemDto>();
  const fresh = current && (rows.find((x) => x.id === current.id) ?? current);
  const selected = dirty ? fresh ?? rows[0] : rows.find((x) => x.id === current?.id) ?? rows[0];
  const choose = (id: string) => {
    const next = rows.find((x) => x.id === id);
    if (dirty && id !== selected?.id) setPending(next);
    else setCurrent(next);
  };
  const edited = (isDirty: boolean) => { setDirty(isDirty); if (isDirty && !current) setCurrent(selected); };
  const discard = () => { setCurrent(pending); setPending(undefined); };
  return { selected, choose, setDirty: edited, asking: !!pending, cancel: () => setPending(undefined), discard };
}

/**
 * The titles on one side and the open title's path on the other (the screen of the career-path mock-up): search and filters (state, unit, grade,
 * track) above the list, export and import in the header; the actions of a title (preview, title file, ready, reopen) are in its panel.
 * After a failed reload the stale titles, the export and the panel's actions are gone, the panel stays so an unsaved edit is not lost.
 */
export function CareerContentPage() {
  const { t } = useTranslation('career-profile');
  const list = useListPage('career-content');
  const { exportColumns } = useContentColumns();
  const importing = useLearningLinksImport();
  const [open, setOpen] = useState<TitleDialogState>(null);
  const { query, loadAll } = useServerList<CareerTitleListItemDto>('career-content', '/career/titles', list, { search: list.term || undefined, ...toContentQuery(list.filters.values) });
  const rows = query.data?.items ?? [];
  const { selected, choose, setDirty, asking, cancel, discard } = useOpenTitle(rows);
  const exporting = { columns: exportColumns, filename: 'career-content', pageRows: rows, total: query.data?.total ?? 0, loadAll };
  const actions = query.isError ? undefined : <ExchangeButtons permissions={{ export: CorePermission.CareerContentExport, import: CorePermission.CareerContentImport }} exporting={exporting} importing={importing} />;
  return (
    <>
      <PageHeader title={t('content.title')} description={t('content.description')} actions={actions} />
      <div className="grid items-start gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <TitlesColumn list={list} rows={query.isError ? [] : rows} query={query} selectedId={selected?.id} onSelect={choose} />
        {selected && <TitlePanel key={selected.id} title={selected} stale={query.isError} onAction={setOpen} onDirtyChange={setDirty} />}
      </div>
      <TitleDialogs state={open} onClose={() => setOpen(null)} />
      <ConfirmDialog open={asking} onOpenChange={(o) => !o && cancel()} title={t('discard.title')} description={t('discard.description')} confirmLabel={t('discard.confirm')} tone="danger" onConfirm={discard} />
    </>
  );
}
