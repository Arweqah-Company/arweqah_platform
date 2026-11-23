import { CorePermission, NOTICE_TYPES, type NoticeFilterOptionsDto, type NoticeListItemDto } from '@arweqah-platform/shared';
import { Check, CircleCheck, Eye, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/core/permissions/can';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import type { ExportColumn } from '@/shared/data-exchange/types';
import type { FilterValues } from '@/shared/lib/use-filters';
import { useListPage } from '@/shared/lib/use-list-page';
import { useServerList } from '@/shared/lib/use-server-list';
import { Alert, Badge, DataTable, EmptyState, ListToolbar, PageHeader, RowAction, type Column, type FilterField } from '@/shared/ui';
import { useNoticeOptions } from '../api';
import { useAudienceText } from '../manage/manage-model';
import { useNoticeCommands } from '../manage/notice-commands';
import { ChannelBadge, KindBadge, useChannelFilterOptions, useNoticeWords } from '../shared/notice-ui';

function useFields(options: NoticeFilterOptionsDto | undefined): FilterField[] {
  const { t } = useTranslation('notices');
  const channels = useChannelFilterOptions(options?.channels);
  const authors = options?.authors ?? [];
  return [
    { id: 'channelCode', label: t('filters.channel'), type: 'select', options: channels },
    { id: 'kind', label: t('filters.kind'), type: 'select', options: NOTICE_TYPES.map((k) => ({ value: k, label: t(`kind.${k}`) })) },
    { id: 'authorId', label: t('filters.author'), type: 'select', options: authors.map((a) => ({ value: a.id, label: a.name })) },
    { id: 'submittedFrom', label: t('filters.submittedFrom'), type: 'date' },
    { id: 'submittedUntil', label: t('filters.submittedUntil'), type: 'date' },
  ];
}

const toQuery = (v: FilterValues) => ({ channelCode: v.channelCode || undefined, kind: v.kind || undefined, authorId: v.authorId || undefined, submittedFrom: v.submittedFrom || undefined, submittedUntil: v.submittedUntil || undefined });

function useColumns(): Column<NoticeListItemDto>[] {
  const { t } = useTranslation('notices');
  const words = useNoticeWords();
  const audience = useAudienceText();
  return [
    { id: 'title', header: t('columns.title'), className: 'min-w-56', cell: (x) => <span className="flex flex-wrap items-center gap-2"><span className="font-medium">{words.title(x)}</span>{x.version > 1 && <Badge tone="info">{t('approvals.version', { n: x.version })}</Badge>}<ChannelBadge channel={x.channel} /></span> },
    { id: 'kind', header: t('columns.kind'), cell: (x) => <KindBadge kind={x.kind} /> },
    { id: 'author', header: t('columns.authorUnit'), cell: (x) => `${x.author.name} · ${words.unit(x.authorUnit)}` },
    { id: 'submitted', header: t('columns.submitted'), className: 'whitespace-nowrap', cell: (x) => words.day(x.submittedAt) },
    { id: 'publishOn', header: t('columns.publishesShort'), className: 'whitespace-nowrap', cell: (x) => (x.version > 1 ? t('approvals.immediately') : words.day(x.publishOn)) },
    { id: 'audience', header: t('columns.audience'), cell: audience },
  ];
}

function useExportColumns(): ExportColumn<NoticeListItemDto>[] {
  const { t } = useTranslation('notices');
  const words = useNoticeWords();
  const audience = useAudienceText();
  return [
    { id: 'title', header: t('columns.title'), value: (x) => words.title(x) },
    { id: 'kind', header: t('columns.kind'), value: (x) => t(`kind.${x.kind}`) },
    { id: 'author', header: t('columns.author'), value: (x) => x.author.name },
    { id: 'submitted', header: t('columns.submitted'), value: (x) => (x.submittedAt ?? '').slice(0, 10) },
    { id: 'publishOn', header: t('columns.publishesShort'), value: (x) => (x.publishOn ?? '').slice(0, 10) },
    { id: 'audience', header: t('columns.audience'), value: audience },
  ];
}

/** «Waiting for my approval»: the notices written in the leader's unit and below; approve (asks first), reject (with a reason) or open. */
export function ApprovalsPage() {
  const { t } = useTranslation('notices');
  const commands = useNoticeCommands();
  const list = useListPage('notices-approvals');
  const fields = useFields(useNoticeOptions().data);
  const columns = useColumns();
  const exportColumns = useExportColumns();
  const { query, loadAll, table } = useServerList<NoticeListItemDto>('notices-approvals', '/notices/approvals', list, { search: list.term || undefined, ...toQuery(list.filters.values) });
  return (
    <>
      <PageHeader title={t('approvals.title')} description={t('approvals.description')} />
      <div className="mb-4 flex flex-col gap-2"><Alert tone="info">{t('approvals.info')}</Alert></div>
      <DataTable<NoticeListItemDto>
        listKey="notices-approvals"
        {...table}
        caption={t('approvals.title')}
        toolbar={
          <ListToolbar
            listKey="notices-approvals"
            {...list.toolbar({ label: t('approvals.searchLabel'), placeholder: t('manage.searchPlaceholder') }, fields)}
            actions={<ExchangeButtons permissions={{ export: CorePermission.NoticesExport }} exporting={{ columns: exportColumns, filename: 'notice-approvals', pageRows: query.data?.items ?? [], total: query.data?.total ?? 0, loadAll }} />}
          />
        }
        rowKey={(x) => x.id}
        columns={columns}
        onRowClick={(x) => commands.run('view', x)}
        actions={(x) => (
          <>
            <Can permission={CorePermission.NoticesApproveView}><RowAction label={t('actions.view')} icon={Eye} onClick={() => commands.run('view', x)} /></Can>
            {x.abilities.approve && <Can permission={CorePermission.NoticesApprove}><RowAction label={t('actions.approve')} icon={Check} onClick={() => commands.run('approve', x)} /></Can>}
            {x.abilities.reject && <Can permission={CorePermission.NoticesReject}><RowAction danger label={t('actions.reject')} icon={X} onClick={() => commands.run('reject', x)} /></Can>}
          </>
        )}
        empty={<EmptyState icon={CircleCheck} title={list.narrowed ? t('noMatches') : t('approvals.empty')} description={list.narrowed ? undefined : t('approvals.emptyHint')} />}
      />
      <p className="mt-3 text-xs text-muted">{t('approvals.note')}</p>
      {commands.dialogs}
    </>
  );
}
