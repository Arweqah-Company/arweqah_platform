import { Can } from '@/core/permissions/can';
import { CorePermission, type TicketGrouping, TicketListItemDto, TicketsPageDto, TicketTab } from '@arweqah-platform/shared';
import { Columns3, Eye, LayoutGrid, LifeBuoy, Plus, Table2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { apiClient } from '@/core/api/api-client';
import { errorMessage } from '@/shared/lib/error-message';
import { useViewMode } from '@/shared/lib/use-view-mode';
import { useListPage } from '@/shared/lib/use-list-page';
import { useServerList } from '@/shared/lib/use-server-list';
import { Alert, Button, DataTable, EmptyState, FormField, ListToolbar, PageHeader, RowAction, Select, ViewSwitch } from '@/shared/ui';
import { useTicketOptions } from './api';
import { TicketBoard } from './board/ticket-board';
import { NewTicketDialog } from './new-ticket/new-ticket-dialog';
import { GROUPINGS, groupLabel, toTicketsQuery, useTicketFilterFields } from './tickets-filters';
import { useTicketColumns } from './tickets-columns';

const TABS: TicketTab[] = ['mine', 'inbox', 'team'];

/** The tickets I sent; the ones that arrived for me to answer (as assignee, manager, or by my reply scope); and those of the people in my view scope. */
function TabBar({ tab, offered, onChange }: { tab: TicketTab; offered: Record<TicketTab, boolean>; onChange: (tab: TicketTab) => void }) {
  const { t } = useTranslation('tickets');
  return (
    <div role="tablist" aria-label={t('tabsLabel')} className="mb-4 inline-flex rounded-2xl border border-neutral-200 bg-neutral-50 p-1">
      {TABS.filter((x) => offered[x]).map((x) => (
        <button key={x} type="button" role="tab" aria-selected={tab === x} onClick={() => onChange(x)} className={`rounded-xl px-5 py-2 text-sm font-medium transition-colors ${tab === x ? 'bg-white text-link shadow-sm' : 'text-muted hover:text-fg'}`}>
          {t(`tabs.${x}`)}
        </button>
      ))}
    </div>
  );
}

function GroupSelect({ value, onChange }: { value: TicketGrouping | ''; onChange: (value: TicketGrouping | '') => void }) {
  const { t } = useTranslation('tickets');
  return (
    <FormField label={t('groupBy.label')}>
      {(p) => (
        <Select {...p} className="min-w-44" value={value} onChange={(e) => onChange(e.target.value as TicketGrouping | '')}>
          <option value="">{t('groupBy.none')}</option>
          {GROUPINGS.map((g) => <option key={g} value={g}>{t(`groupBy.${g}`)}</option>)}
        </Select>
      )}
    </FormField>
  );
}

type TicketsMode = 'table' | 'cards' | 'board';
const BOARD_SIZE = 100;
type TicketParams = Record<string, string | number | undefined>;

/** The board shows one page of the same search and filters (no paging between columns); a note says when there are more. */
function BoardContent({ params, empty }: { params: TicketParams; empty: ReactNode }) {
  const { t } = useTranslation('tickets');
  const { t: tc } = useTranslation();
  const query = useQuery({ queryKey: ['tickets', 'board', params], queryFn: () => apiClient.get<TicketsPageDto>('/tickets', { ...params, page: 1, pageSize: BOARD_SIZE }) });
  if (query.error) return <Alert>{errorMessage(tc, query.error)}</Alert>;
  if (!query.data) return <div role="status" aria-label={t('loading')} className="h-24 animate-pulse rounded-2xl bg-neutral-50" />;
  if (query.data.total === 0) return <>{empty}</>;
  return (
    <>
      <TicketBoard tickets={query.data.items} />
      {query.data.total > query.data.items.length && <p className="mt-3 text-xs text-muted">{t('board.truncated', { shown: query.data.items.length, total: query.data.total })}</p>}
    </>
  );
}

function TicketsTable({ mode, tab, groupBy, params, list, toolbar, empty }: { mode: TicketsMode; tab: TicketTab; groupBy: TicketGrouping | ''; params: TicketParams; list: ReturnType<typeof useListPage>; toolbar: ReactNode; empty: ReactNode }) {
  const { t, i18n } = useTranslation('tickets');
  const { t: tc } = useTranslation();
  const navigate = useNavigate();
  const columns = useTicketColumns(tab);
  const { table } = useServerList<TicketListItemDto>('tickets', '/tickets', list, params);
  return (
    <DataTable<TicketListItemDto>
      listKey="tickets"
      {...table}
      view={mode === 'cards' ? 'cards' : 'table'}
      caption={t(`tabs.${tab}`)}
      toolbar={toolbar}
      rowKey={(x) => x.id}
      onRowClick={(x) => navigate(`/tickets/${x.id}`)}
      actions={(x) => <RowAction label={tc('actions.view')} icon={Eye} to={`/tickets/${x.id}`} />}
      groupOf={groupBy ? (x) => groupLabel(x, groupBy, t, i18n.language === 'ar') : undefined}
      empty={empty}
      columns={columns}
    />
  );
}

function TicketsBody({ tab, mode, groupBy, params, list, toolbar }: { tab: TicketTab; mode: TicketsMode; groupBy: TicketGrouping | ''; params: TicketParams; list: ReturnType<typeof useListPage>; toolbar: ReactNode }) {
  const { t } = useTranslation('tickets');
  const empty = <EmptyState icon={LifeBuoy} title={list.narrowed ? t('noMatches') : t(`empty.${tab}`)} description={list.narrowed ? undefined : t(`emptyHint.${tab}`)} />;
  if (mode !== 'board') return <TicketsTable mode={mode} tab={tab} groupBy={groupBy} params={params} list={list} toolbar={toolbar} empty={empty} />;
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-3 shadow-sm shadow-ink/5 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-end gap-3">{toolbar}</div>
      <BoardContent params={params} empty={empty} />
    </div>
  );
}

export function TicketsPage() {
  const { t } = useTranslation('tickets');
  const { t: tc } = useTranslation();
  const [tab, setTab] = useState<TicketTab>('mine');
  const [groupBy, setGroupBy] = useState<TicketGrouping | ''>('');
  const [creating, setCreating] = useState(false);
  const [mode, setMode] = useViewMode<TicketsMode>('tickets-mode', { modes: ['table', 'board', 'cards'], phoneDefault: 'cards' });
  const options = useTicketOptions();
  const list = useListPage('tickets');
  const fields = useTicketFilterFields(options.data, list.filters.values);
  const params = { tab, search: list.term || undefined, groupBy: mode !== 'board' ? groupBy || undefined : undefined, ...toTicketsQuery(list.filters.values) };
  const switchTab = (next: TicketTab) => {
    setTab(next);
    list.setPage(1);
  };
  const views = [{ id: 'table' as const, label: tc('view.table'), icon: Table2 }, { id: 'board' as const, label: tc('view.board'), icon: Columns3 }, { id: 'cards' as const, label: tc('view.cards'), icon: LayoutGrid }];
  const toolbar = (
    <ListToolbar
      listKey="tickets"
      {...list.toolbar({ label: t('searchLabel'), placeholder: t('searchPlaceholder') }, fields, false)}
      actions={<>{mode !== 'board' && <GroupSelect value={groupBy} onChange={setGroupBy} />}<ViewSwitch value={mode} onChange={setMode} choices={views} /></>}
    />
  );
  return (
    <>
      <PageHeader title={t('title')} description={t('description')} actions={<Can permission={CorePermission.TicketsCreate}><Button onClick={() => setCreating(true)}><Plus className="size-4" aria-hidden />{t('newTicket')}</Button></Can>} />
      <TabBar tab={tab} offered={{ mine: true, inbox: options.data?.hasInbox ?? false, team: options.data?.hasTeam ?? false }} onChange={switchTab} />
      <TicketsBody tab={tab} mode={mode} groupBy={groupBy} params={params} list={list} toolbar={toolbar} />
      <NewTicketDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}
