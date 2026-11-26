import { formatDate } from '@/shared/lib/format-date';
import {
  NOTICE_ACK_RATE_BANDS,
  NOTICE_MANAGE_STATES,
  NOTICE_TYPES,
  type NoticeFilterOptionsDto,
  type NoticeListItemDto,
  type NoticeAudienceUnitOptionDto,
} from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import type { FilterValues } from '@/shared/lib/use-filters';
import type { Column, FilterField } from '@/shared/ui';
import { ChannelBadge, KindBadge, StatusBadges, useChannelFilterOptions, useNoticeWords } from '../shared/notice-ui';
import type { ExportColumn } from '@/shared/data-exchange/types';

/** The filters of the manage list; the unit of the author is a `unitId` picked from the active units. */
export function useManageFilterFields(options: NoticeFilterOptionsDto | undefined, units: NoticeAudienceUnitOptionDto[] | undefined): FilterField[] {
  const { t, i18n } = useTranslation('notices');
  const ar = i18n.language === 'ar';
  const channels = useChannelFilterOptions(options?.channels);
  return [
    { id: 'channelCode', label: t('filters.channel'), type: 'select', options: channels },
    { id: 'kind', label: t('filters.kind'), type: 'select', options: NOTICE_TYPES.map((k) => ({ value: k, label: t(`kind.${k}`) })) },
    { id: 'state', label: t('filters.state'), type: 'select', options: NOTICE_MANAGE_STATES.map((s) => ({ value: s, label: t(`state.${s}`) })) },
    { id: 'authorId', label: t('filters.author'), type: 'select', options: (options?.authors ?? []).map((a) => ({ value: a.id, label: a.name })) },
    { id: 'unitId', label: t('filters.unit'), type: 'select', options: (units ?? []).map((u) => ({ value: u.id, label: ar ? u.nameAr : u.nameEn })) },
    { id: 'publishedFrom', label: t('filters.publishedFrom'), type: 'date' },
    { id: 'publishedUntil', label: t('filters.publishedUntil'), type: 'date' },
    { id: 'pinned', label: t('filters.pinned'), type: 'toggle' },
    { id: 'ackRate', label: t('filters.ackRate'), type: 'select', options: NOTICE_ACK_RATE_BANDS.map((b) => ({ value: b, label: t(`ackRate.${b}`) })) },
  ];
}

const text = (v: FilterValues, id: string) => v[id] || undefined;

export const toManageQuery = (v: FilterValues) => ({
  channelCode: text(v, 'channelCode'),
  kind: text(v, 'kind'),
  state: text(v, 'state'),
  authorId: text(v, 'authorId'),
  unitId: text(v, 'unitId'),
  publishedFrom: text(v, 'publishedFrom'),
  publishedUntil: text(v, 'publishedUntil'),
  pinned: text(v, 'pinned'),
  ackRate: text(v, 'ackRate'),
});

function AckBar({ n }: { n: NoticeListItemDto }) {
  const { t } = useTranslation('notices');
  if (!n.ack) return <span className="text-muted">—</span>;
  return (
    <span className="flex min-w-28 items-center gap-2">
      <progress className="h-2 w-20 accent-petrol-800" max={100} value={n.ack.percent} aria-label={t('columns.ack')} />
      <span dir="ltr" className="text-xs">{n.ack.percent}%</span>
    </span>
  );
}

/** «All employees (1,240)» or «3 rules (860)». */
export function useAudienceText() {
  const { t } = useTranslation('notices');
  return (n: NoticeListItemDto) => {
    const reached = n.audience.recipients;
    const base = n.audience.all ? t('columns.everyone') : t('columns.rules', { count: n.audience.rules });
    return reached === null ? base : `${base} (${reached.toLocaleString('en')})`;
  };
}

export function useManageColumns(): Column<NoticeListItemDto>[] {
  const { t } = useTranslation('notices');
  const words = useNoticeWords();
  const audience = useAudienceText();
  return [
    { id: 'title', header: t('columns.title'), sortKey: 'title', className: 'min-w-56', cell: (x) => <span className="flex flex-col"><span className="font-medium">{words.title(x)}</span><span className="text-xs text-muted">{x.publishedAt || !x.publishOn ? t('columns.version', { n: x.version }) : t('columns.publishesOn', { date: words.day(x.publishOn) })}</span></span> },
    { id: 'channel', header: t('columns.channel'), cell: (x) => <ChannelBadge channel={x.channel} /> },
    { id: 'kind', header: t('columns.kind'), cell: (x) => <KindBadge kind={x.kind} /> },
    { id: 'author', header: t('columns.author'), cell: (x) => x.author.name },
    { id: 'status', header: t('columns.status'), sortKey: 'status', cell: (x) => <StatusBadges notice={x} /> },
    { id: 'audience', header: t('columns.audience'), cell: audience },
    { id: 'publishOn', header: t('columns.publishOn'), sortKey: 'publishOn', className: 'whitespace-nowrap', cell: (x) => words.day(x.publishedAt ?? x.publishOn) },
    { id: 'ack', header: t('columns.ack'), cell: (x) => <AckBar n={x} /> },
  ];
}

export function useManageExportColumns(): ExportColumn<NoticeListItemDto>[] {
  const { t } = useTranslation('notices');
  const words = useNoticeWords();
  const audience = useAudienceText();
  return [
    { id: 'title', header: t('columns.title'), value: (x) => words.title(x) },
    { id: 'channel', header: t('columns.channel'), value: (x) => words.channel(x.channel) },
    { id: 'kind', header: t('columns.kind'), value: (x) => t(`kind.${x.kind}`) },
    { id: 'author', header: t('columns.author'), value: (x) => x.author.name },
    { id: 'status', header: t('columns.status'), value: (x) => (x.hiddenForRevision ? t('status.hiddenForRevision') : t(`status.${x.status}`)) },
    { id: 'audience', header: t('columns.audience'), value: audience },
    { id: 'publishOn', header: t('columns.publishOn'), value: (x) => formatDate(x.publishedAt ?? x.publishOn) },
    { id: 'ack', header: t('columns.ack'), value: (x) => (x.ack ? `${x.ack.percent}%` : '') },
  ];
}

