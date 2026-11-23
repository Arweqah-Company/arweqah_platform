import { CorePermission, NOTICE_MINE_TABS, NOTICE_MY_STATES, NOTICE_TYPES, type NoticeMineItemDto, type NoticeMinePageDto, type NoticeMineTab } from '@arweqah-platform/shared';
import { Eye, Megaphone } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { Can } from '@/core/permissions/can';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { useListPage } from '@/shared/lib/use-list-page';
import { useServerList } from '@/shared/lib/use-server-list';
import type { FilterValues } from '@/shared/lib/use-filters';
import { Badge, DataTable, EmptyState, ListToolbar, PageHeader, RowAction, Tabs, type Column, type FilterField } from '@/shared/ui';
import { useMineChannels } from '../api';
import { ChannelBadge, KindBadge, MyStateBadge, useChannelFilterOptions, useNoticeWords } from '../shared/notice-ui';
import { NoticeCard } from './notice-card';
import { ReadDialog } from './read-dialog';

const isTab = (value: string | null): value is NoticeMineTab => !!value && (NOTICE_MINE_TABS as readonly string[]).includes(value);

function useFilterFields(): FilterField[] {
  const { t } = useTranslation('notices');
  const channels = useChannelFilterOptions(useMineChannels().data);
  return [
    { id: 'channelCode', label: t('filters.channel'), type: 'select', options: channels },
    { id: 'kind', label: t('filters.kind'), type: 'select', options: NOTICE_TYPES.map((k) => ({ value: k, label: t(`kind.${k}`) })) },
    { id: 'myState', label: t('filters.myState'), type: 'select', options: NOTICE_MY_STATES.map((s) => ({ value: s, label: t(`myState.${s}`) })) },
    { id: 'publishedFrom', label: t('filters.publishedFrom'), type: 'date' },
    { id: 'publishedUntil', label: t('filters.publishedUntil'), type: 'date' },
    { id: 'pinned', label: t('filters.pinned'), type: 'toggle' },
  ];
}

const toQuery = (v: FilterValues) => ({ channelCode: v.channelCode || undefined, kind: v.kind || undefined, myState: v.myState || undefined, publishedFrom: v.publishedFrom || undefined, publishedUntil: v.publishedUntil || undefined, pinned: v.pinned || undefined });

function useColumns(): Column<NoticeMineItemDto>[] {
  const { t } = useTranslation('notices');
  const words = useNoticeWords();
  return [
    { id: 'title', header: t('columns.title'), className: 'min-w-56', cell: (x) => <span className="flex flex-col gap-1"><span className="font-medium">{words.title(x)}</span>{x.isPinned && <span><Badge tone="info">{t('pinned')}</Badge></span>}</span> },
    { id: 'channel', header: t('columns.channel'), cell: (x) => <ChannelBadge channel={x.channel} /> },
    { id: 'kind', header: t('columns.kind'), cell: (x) => <KindBadge kind={x.kind} /> },
    { id: 'publishedAt', header: t('columns.publishedAt'), className: 'whitespace-nowrap', cell: (x) => words.day(x.publishedAt) },
    { id: 'myState', header: t('columns.myState'), cell: (x) => <MyStateBadge state={x.myState} olderVersion={x.acknowledgedOlderVersion} /> },
  ];
}

function useExportColumns(): ExportColumn<NoticeMineItemDto>[] {
  const { t } = useTranslation('notices');
  const words = useNoticeWords();
  return [
    { id: 'title', header: t('columns.title'), value: (x) => words.title(x) },
    { id: 'channel', header: t('columns.channel'), value: (x) => words.channel(x.channel) },
    { id: 'kind', header: t('columns.kind'), value: (x) => t(`kind.${x.kind}`) },
    { id: 'publishedAt', header: t('columns.publishedAt'), value: (x) => x.publishedAt.slice(0, 10) },
    { id: 'myState', header: t('columns.myState'), value: (x) => t(`myState.${x.myState}`) },
  ];
}

/** «My notices»: what reached me, tabs by what I still owe (acknowledge) and what I did. No import: a notice is written and approved, not made from a file. */
export function MyNoticesPage() {
  const { t } = useTranslation('notices');
  const columns = useColumns();
  const exportColumns = useExportColumns();
  const [params, setParams] = useSearchParams();
  const tab: NoticeMineTab = isTab(params.get('tab')) ? (params.get('tab') as NoticeMineTab) : 'all';
  const [reading, setReading] = useState<string | null>(null);
  const list = useListPage('notices');
  const fields = useFilterFields();
  const query = { tab, search: list.term || undefined, ...toQuery(list.filters.values) };
  const { query: result, loadAll, table } = useServerList<NoticeMineItemDto>('notices-mine', '/notices/mine', list, query);
  const counts = (result.data as NoticeMinePageDto | undefined)?.counts;
  const rows = result.data?.items ?? [];
  const tabs = NOTICE_MINE_TABS.map((id) => ({ id, label: t(`tabs.${id}`), count: id === 'await' ? counts?.await : undefined }));
  const switchTab = (next: NoticeMineTab) => {
    setParams(next === 'all' ? {} : { tab: next });
    list.setPage(1);
  };
  const toolbar = (
    <ListToolbar
      listKey="notices"
      {...list.toolbar({ label: t('mine.searchLabel'), placeholder: t('mine.searchPlaceholder') }, fields)}
      actions={<ExchangeButtons permissions={{ export: CorePermission.NoticesExportMine }} exporting={{ columns: exportColumns, filename: 'my-notices', pageRows: rows, total: result.data?.total ?? 0, loadAll }} />}
    />
  );
  return (
    <>
      <PageHeader title={t('mine.title')} description={t('mine.description')} />
      <Tabs tabs={tabs} value={tab} label={t('mine.tabsLabel')} onChange={switchTab} />
      <DataTable<NoticeMineItemDto>
        listKey="notices"
        {...table}
        caption={t('mine.title')}
        toolbar={toolbar}
        rowKey={(x) => x.id}
        columns={columns}
        onRowClick={(x) => setReading(x.id)}
        renderCard={(x) => <NoticeCard notice={x} onOpen={setReading} />}
        actions={(x) => <Can permission={CorePermission.NoticesView}><RowAction label={x.kind === 'policy' && x.myState === 'await' ? t('read.readAndAcknowledge') : t('read.read')} icon={Eye} onClick={() => setReading(x.id)} /></Can>}
        empty={<EmptyState icon={Megaphone} title={list.narrowed ? t('noMatches') : t('mine.empty')} description={list.narrowed ? undefined : t('mine.emptyHint')} />}
      />
      <ReadDialog id={reading} onClose={() => setReading(null)} />
    </>
  );
}
