import { formatDate } from '@/shared/lib/format-date';
import { CorePermission, NOTICE_ACK_STATES, type NoticeAckState, type NoticeAcknowledgementRowDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { fetchAllPages } from '@/shared/lib/fetch-all-pages';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { apiClient } from '@/core/api/api-client';
import { useDebounced } from '@/shared/lib/use-debounced';
import { Avatar, Badge, DataTable, FormField, SearchInput, Select, StatTile, type Column } from '@/shared/ui';
import { NOTICE_LIMITS, type NoticeAcknowledgementsDto } from '@arweqah-platform/shared';
import { useAcknowledgements } from '../api';
import { useNoticeWords } from '../shared/notice-ui';

const TONES: Record<NoticeAckState, 'success' | 'info' | 'warning'> = { acknowledged: 'success', older_version: 'info', pending: 'warning', joined_later: 'info' };

function useColumns(): Column<NoticeAcknowledgementRowDto>[] {
  const { t } = useTranslation('notices');
  const words = useNoticeWords();
  return [
    { id: 'name', header: t('acks.employee'), cell: (x) => <span className="flex items-center gap-2"><Avatar name={x.name} size="sm" />{x.name}</span> },
    { id: 'unit', header: t('acks.unit'), cell: (x) => words.unit(x.unit) },
    { id: 'deliveredAt', header: t('acks.deliveredAt'), className: 'whitespace-nowrap', cell: (x) => words.day(x.deliveredAt) },
    { id: 'state', header: t('acks.state'), cell: (x) => <Badge tone={TONES[x.state]}>{x.state === 'acknowledged' ? t('acks.states.acknowledgedAt', { date: words.day(x.acknowledgedAt) }) : t(`acks.states.${x.state}`)}</Badge> },
  ];
}

function useExportColumns(): ExportColumn<NoticeAcknowledgementRowDto>[] {
  const { t } = useTranslation('notices');
  const words = useNoticeWords();
  return [
    { id: 'name', header: t('acks.employee'), value: (x) => x.name },
    { id: 'unit', header: t('acks.unit'), value: (x) => words.unit(x.unit) },
    { id: 'deliveredAt', header: t('acks.deliveredAt'), value: (x) => formatDate(x.deliveredAt) },
    { id: 'state', header: t('acks.state'), value: (x) => t(`acks.states.${x.state === 'acknowledged' ? 'acknowledged' : x.state}`) },
    { id: 'acknowledgedAt', header: t('acks.acknowledgedAt'), value: (x) => formatDate(x.acknowledgedAt) },
  ];
}

function useAckList(id: string) {
  const [search, setSearch] = useState('');
  const [state, setState] = useState<NoticeAckState | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const term = useDebounced(search);
  const filters = { search: term || undefined, state: state || undefined };
  const query = useAcknowledgements(id, { ...filters, page, pageSize });
  const loadAll = () => fetchAllPages<NoticeAcknowledgementRowDto>((p, size) => apiClient.get<NoticeAcknowledgementsDto>(`/notices/${id}/acknowledgements`, { ...filters, page: p, pageSize: size }), NOTICE_LIMITS.exportRows);
  return {
    query,
    loadAll,
    search,
    state,
    setSearch: (v: string) => { setSearch(v); setPage(1); },
    setState: (v: NoticeAckState | '') => { setState(v); setPage(1); },
    setPage,
    setPageSize: (n: number) => { setPageSize(n); setPage(1); },
  };
}

type AckList = ReturnType<typeof useAckList>;

function AckToolbar({ list, columns }: { list: AckList; columns: ExportColumn<NoticeAcknowledgementRowDto>[] }) {
  const { t } = useTranslation('notices');
  return (
    <>
      <SearchInput aria-label={t('acks.search')} placeholder={t('acks.search')} value={list.search} onChange={(e) => list.setSearch(e.target.value)} />
      <FormField label={t('acks.state')}>
        {(p) => (
          <Select {...p} className="min-w-44" value={list.state} onChange={(e) => list.setState(e.target.value as NoticeAckState | '')}>
            <option value="">{t('acks.allStates')}</option>
            {NOTICE_ACK_STATES.map((s) => <option key={s} value={s}>{t(`acks.states.${s}`)}</option>)}
          </Select>
        )}
      </FormField>
      <ExchangeButtons permissions={{ export: CorePermission.NoticesAckExport }} exporting={{ columns, filename: 'notice-acknowledgements', pageRows: list.query.data?.items ?? [], total: list.query.data?.total ?? 0, loadAll: list.loadAll }} />
    </>
  );
}

/** Who got the notice and who acknowledged it: three figures, a search, a state filter and an export (inside the reader's reach). */
export function AcksTab({ id }: { id: string }) {
  const { t } = useTranslation('notices');
  const list = useAckList(id);
  const columns = useColumns();
  const exportColumns = useExportColumns();
  const { query } = list;
  const summary = query.data?.summary;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label={t('acks.reached')} value={summary?.reached} />
        <StatTile label={t('acks.acknowledged')} value={summary?.acknowledged} />
        <StatTile label={t('acks.pending')} value={summary?.pending} tone={summary?.pending ? 'attention' : 'neutral'} />
      </div>
      <DataTable<NoticeAcknowledgementRowDto>
        caption={t('tabs.acks')}
        columns={columns}
        rows={query.data?.items}
        page={query.data}
        isLoading={query.isPending}
        error={query.error}
        rowKey={(x) => x.userId}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        toolbar={<AckToolbar list={list} columns={exportColumns} />}
      />
    </div>
  );
}
