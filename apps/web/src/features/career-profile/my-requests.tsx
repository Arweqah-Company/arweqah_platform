import { CorePermission, type DevelopmentRequestDto } from '@arweqah-platform/shared';
import { Eye, Send } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import { matchesText } from '@/shared/lib/text-match';
import { useListPage } from '@/shared/lib/use-list-page';
import { DataTable, EmptyState, ListToolbar, RowAction } from '@/shared/ui';
import { useMyRequests } from './api';
import { RequestDetails, useRequestColumns, useRequestFilters } from './request-columns';

/** The requests the search and the filters (state, plan) keep. */
export function filterRequests(rows: readonly DevelopmentRequestDto[], term: string, filters: Record<string, string | undefined>): DevelopmentRequestDto[] {
  return rows.filter((r) => matchesText([r.courseName], term) && (!filters.status || r.status === filters.status) && (!filters.plan || r.plan === filters.plan));
}

/** «My requests»: the learning the signed-in employee asked to be paid for and where each request is; a click on a row opens its details. */
export function MyRequests() {
  const { t } = useTranslation('career-profile');
  const list = useListPage('career-my-requests');
  const query = useMyRequests();
  const { columns, exportColumns } = useRequestColumns(false);
  const [open, setOpen] = useState<DevelopmentRequestDto | null>(null);
  const rows = filterRequests(query.data ?? [], list.term, list.filters.values);
  const exporting = { columns: exportColumns, filename: 'career-my-requests', pageRows: rows, total: rows.length, loadAll: async () => rows };
  return (
    <div className="flex flex-col gap-2">
      <DataTable<DevelopmentRequestDto>
        listKey="career-my-requests"
        caption={t('requests.mineTitle')}
        view={list.view}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={query.isLoading}
        error={query.isError}
        onRowClick={setOpen}
        toolbar={<ListToolbar listKey="career-my-requests" {...list.toolbar({ label: t('requests.mineSearchLabel'), placeholder: t('requests.mineSearchPlaceholder') }, useRequestFilters(false))} actions={<ExchangeButtons permissions={{ export: CorePermission.CareerLearningExport }} exporting={exporting} />} />}
        actions={(r) => <RowAction label={`${t('requests.details')}: ${r.courseName}`} icon={Eye} onClick={() => setOpen(r)} />}
        empty={<EmptyState icon={Send} title={list.narrowed ? t('requests.mineNoMatches') : t('requests.mineEmpty')} />}
        columns={columns}
      />
      {open && <RequestDetails request={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
