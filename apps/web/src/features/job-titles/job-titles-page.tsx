import { CorePermission, type JobTitleListItemDto } from '@arweqah-platform/shared';
import { BriefcaseBusiness, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/core/permissions/can';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import { useListPage } from '@/shared/lib/use-list-page';
import { useServerList } from '@/shared/lib/use-server-list';
import { Button, DataTable, EmptyState, ListToolbar, PageHeader } from '@/shared/ui';
import { AddTitleFlow } from './add-title-dialog';
import { useTitleColumns } from './job-titles-columns';
import { toTitlesQuery, useTitleFilterFields } from './job-titles-filters';
import { useTitlesImport } from './job-titles-import';
import { TitleDialogs, type TitleDialogState } from './title-dialogs';
import { TitleRowActions } from './title-row-actions';

/** Export (every result of the search and filters) and import: each button shows only for the person who holds its key. */
function TitleExchange({ rows, total, loadAll }: { rows: JobTitleListItemDto[]; total: number; loadAll: () => Promise<JobTitleListItemDto[]> }) {
  const importing = useTitlesImport();
  const { exportColumns } = useTitleColumns();
  return <ExchangeButtons permissions={{ export: CorePermission.JobTitlesExport, import: CorePermission.JobTitlesImport }} exporting={{ columns: exportColumns, filename: 'job-titles', pageRows: rows, total, loadAll }} importing={importing} />;
}

/** What shows when the list has no rows: nothing matches the search and filters, or there is no title yet. */
function TitlesEmpty({ narrowed }: { narrowed: boolean }) {
  const { t } = useTranslation('job-titles');
  return <EmptyState icon={BriefcaseBusiness} title={narrowed ? t('noMatches') : t('empty')} description={narrowed ? undefined : t('emptyHint')} />;
}

/** The job titles of the group in one list: search by name or code, filters by the unit, the grade, the track and the vacancy, table or cards, export and import. A click on a row opens the title's card. */
export function JobTitlesPage() {
  const { t } = useTranslation('job-titles');
  const list = useListPage('job-titles');
  const fields = useTitleFilterFields();
  const { columns } = useTitleColumns();
  const [open, setOpen] = useState<TitleDialogState>(null);
  const { query, loadAll, table } = useServerList<JobTitleListItemDto>('job-titles', '/org/job-titles', list, { search: list.term || undefined, ...toTitlesQuery(list.filters.values) });
  const rows = query.data?.items ?? [];
  const firstId = rows[0]?.id;
  return (
    <>
      <PageHeader title={t('title')} description={t('description')} actions={<Can adminMode permission={CorePermission.JobTitlesCreate}><Button onClick={() => setOpen({ kind: 'add' })}><Plus className="size-4" aria-hidden />{t('add.button')}</Button></Can>} />
      <DataTable<JobTitleListItemDto>
        listKey="job-titles"
        {...table}
        caption={t('title')}
        toolbar={<ListToolbar listKey="job-titles" {...list.toolbar({ label: t('searchLabel'), placeholder: t('searchPlaceholder') }, fields)} actions={<TitleExchange rows={rows} total={query.data?.total ?? 0} loadAll={loadAll} />} />}
        rowKey={(x) => x.id}
        onRowClick={(x) => setOpen({ kind: 'card', title: x })}
        actions={(x) => <TitleRowActions title={x} first={x.id === firstId} onOpen={setOpen} />}
        empty={<TitlesEmpty narrowed={list.narrowed} />}
        columns={columns}
      />
      <TitleDialogs state={open} onClose={() => setOpen(null)} />
      {open?.kind === 'add' && <AddTitleFlow onClose={() => setOpen(null)} />}
    </>
  );
}
