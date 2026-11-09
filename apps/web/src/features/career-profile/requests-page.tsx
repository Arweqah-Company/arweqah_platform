import { CorePermission, type DevelopmentRequestDto } from '@arweqah-platform/shared';
import { Check, Eye, Send, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/core/permissions/can';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import { useListPage } from '@/shared/lib/use-list-page';
import { useServerList } from '@/shared/lib/use-server-list';
import { Alert, DataTable, EmptyState, ListToolbar, PageHeader, RowAction, Tabs } from '@/shared/ui';
import { REQUESTS_KEY } from './api';
import { RequestDialogs, type RequestDialogState } from './request-dialogs';
import { useRequestColumns, useRequestFilters } from './request-columns';

/** The decisions on a request that is with the viewer, as icons on its row, each with its own key (the reason of a rejection is asked in a window). */
function RequestActions({ item, onOpen }: { item: DevelopmentRequestDto; onOpen: (state: RequestDialogState) => void }) {
  const { t } = useTranslation('career-profile');
  const label = (key: string) => `${t(key)}: ${item.courseName}`;
  return (
    <>
      <RowAction label={label('requests.page.open')} icon={Eye} onClick={() => onOpen({ kind: 'open', item })} />
      {item.canDecide && <Can permission={CorePermission.CareerRequestsApprove}><RowAction label={label('requests.approve')} icon={Check} onClick={() => onOpen({ kind: 'open', item })} /></Can>}
      {item.canDecide && <Can permission={CorePermission.CareerRequestsReject}><RowAction label={label('requests.reject.action')} icon={X} danger onClick={() => onOpen({ kind: 'reject', item })} /></Can>}
    </>
  );
}

const VIEWS = ['waiting', 'all'] as const;
type View = (typeof VIEWS)[number];

/** What the server is asked: the search, the filters and, on the «waiting for me» view, only the requests with the viewer. */
function requestParams(list: ReturnType<typeof useListPage>, view: View): Record<string, string | undefined> {
  const { status, level, plan } = list.filters.values;
  return { search: list.term || undefined, status: status || undefined, level: level || undefined, plan: plan || undefined, mine: view === 'waiting' ? 'true' : undefined };
}

/** «Development requests»: what waits for the viewer's decision, or every request of the people their scope reaches; a click on a row opens it. */
export function RequestsPage() {
  const { t } = useTranslation('career-profile');
  const list = useListPage('career-requests');
  const fields = useRequestFilters(true);
  const { columns, exportColumns } = useRequestColumns(true);
  const [view, setView] = useState<View>('waiting');
  const [open, setOpen] = useState<RequestDialogState>(null);
  const { query, loadAll, table } = useServerList<DevelopmentRequestDto>(REQUESTS_KEY, '/career/requests', list, requestParams(list, view));
  const exporting = { columns: exportColumns, filename: 'career-requests', pageRows: query.data?.items ?? [], total: query.data?.total ?? 0, loadAll };
  return (
    <>
      <PageHeader title={t('requests.page.title')} description={t('requests.page.description')} />
      <Alert tone="info">{t('requests.page.scope')}</Alert>
      <Tabs tabs={VIEWS.map((id) => ({ id, label: t(`requests.page.${id}`) }))} value={view} label={t('requests.page.tabs')} onChange={setView} />
      <DataTable<DevelopmentRequestDto>
        listKey="career-requests"
        {...table}
        caption={t('requests.page.title')}
        toolbar={<ListToolbar listKey="career-requests" {...list.toolbar({ label: t('requests.page.searchLabel'), placeholder: t('requests.page.searchPlaceholder') }, fields)} actions={<ExchangeButtons permissions={{ export: CorePermission.CareerRequestsExport }} exporting={exporting} />} />}
        rowKey={(x) => x.id}
        onRowClick={(x) => setOpen({ kind: 'open', item: x })}
        actions={(x) => <RequestActions item={x} onOpen={setOpen} />}
        empty={<EmptyState icon={Send} title={list.narrowed ? t('requests.page.noMatches') : t('requests.page.empty')} />}
        columns={columns}
      />
      <RequestDialogs state={open} onChange={setOpen} />
    </>
  );
}
