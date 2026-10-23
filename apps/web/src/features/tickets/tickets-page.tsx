import type { TicketGrouping, TicketListItemDto, TicketTab } from '@arweqah-platform/shared';
import { LifeBuoy, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useListPage } from '@/shared/lib/use-list-page';
import { useServerList } from '@/shared/lib/use-server-list';
import { Button, DataTable, EmptyState, FormField, ListToolbar, PageHeader, Select } from '@/shared/ui';
import { useTicketOptions } from './api';
import { NewTicketDialog } from './new-ticket/new-ticket-dialog';
import { GROUPINGS, groupLabel, toTicketsQuery, useTicketFilterFields } from './tickets-filters';
import { useTicketColumns } from './tickets-columns';

const TABS: TicketTab[] = ['mine', 'inbox'];

/** Two tabs: the tickets I sent, and the ones that arrived for me to answer (as assignee or manager). */
function TabBar({ tab, hasInbox, onChange }: { tab: TicketTab; hasInbox: boolean; onChange: (tab: TicketTab) => void }) {
  const { t } = useTranslation('tickets');
  return (
    <div role="tablist" aria-label={t('tabsLabel')} className="mb-4 inline-flex rounded-2xl border border-neutral-200 bg-neutral-50 p-1">
      {TABS.filter((x) => x === 'mine' || hasInbox).map((x) => (
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

export function TicketsPage() {
  const { t, i18n } = useTranslation('tickets');
  const [tab, setTab] = useState<TicketTab>('mine');
  const [groupBy, setGroupBy] = useState<TicketGrouping | ''>('');
  const [creating, setCreating] = useState(false);
  const options = useTicketOptions();
  const list = useListPage('tickets');
  const fields = useTicketFilterFields(options.data, list.filters.values);
  const columns = useTicketColumns(tab);
  const params = { tab, search: list.term || undefined, groupBy: groupBy || undefined, ...toTicketsQuery(list.filters.values) };
  const { table } = useServerList<TicketListItemDto>('tickets', '/tickets', list, params);
  const switchTab = (next: TicketTab) => {
    setTab(next);
    list.setPage(1);
  };

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} actions={<Button onClick={() => setCreating(true)}><Plus className="size-4" aria-hidden />{t('newTicket')}</Button>} />
      <TabBar tab={tab} hasInbox={options.data?.hasInbox ?? false} onChange={switchTab} />
      <DataTable<TicketListItemDto>
        {...table}
        caption={t(`tabs.${tab}`)}
        toolbar={<ListToolbar {...list.toolbar({ label: t('searchLabel'), placeholder: t('searchPlaceholder') }, fields)} actions={<GroupSelect value={groupBy} onChange={setGroupBy} />} />}
        rowKey={(x) => x.id}
        groupOf={groupBy ? (x) => groupLabel(x, groupBy, t, i18n.language === 'ar') : undefined}
        empty={<EmptyState icon={LifeBuoy} title={list.narrowed ? t('noMatches') : t(`empty.${tab}`)} description={list.narrowed ? undefined : t(`emptyHint.${tab}`)} />}
        columns={columns}
      />
      <NewTicketDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}
