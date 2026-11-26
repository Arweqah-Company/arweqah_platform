import { formatDate } from '@/shared/lib/format-date';
import type { NoticeChannelDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import type { ExportColumn } from '@/shared/data-exchange/types';
import type { FilterValues } from '@/shared/lib/use-filters';
import { matchesText } from '@/shared/lib/text-match';
import { Badge, type Column, type FilterField } from '@/shared/ui';
import { useNoticeWords } from '../shared/notice-ui';

/** The state of a channel as a badge: enabled (its writers write) or disabled (its notices stay, nobody writes). */
export function ChannelStateBadge({ channel }: { channel: Pick<NoticeChannelDto, 'isActive'> }) {
  const { t } = useTranslation('notices');
  return <Badge tone={channel.isActive ? 'success' : 'neutral'}>{t(channel.isActive ? 'channels.active' : 'channels.disabled')}</Badge>;
}

export function useChannelColumns(): Column<NoticeChannelDto>[] {
  const { t } = useTranslation('notices');
  const words = useNoticeWords();
  return [
    { id: 'name', header: t('channels.name'), className: 'min-w-48', cell: (c) => <span className="flex flex-col"><span className="font-medium">{words.channel(c)}</span><span dir="ltr" className="text-start text-xs text-muted">{c.code}</span></span> },
    { id: 'unit', header: t('channels.unit'), cell: (c) => (c.unit ? words.unit(c.unit) : t('channels.companyWide')) },
    { id: 'status', header: t('channels.status'), cell: (c) => <ChannelStateBadge channel={c} /> },
    { id: 'writers', header: t('channels.writers'), className: 'whitespace-nowrap', cell: (c) => c.writersCount },
    { id: 'updatedAt', header: t('channels.updatedAt'), className: 'whitespace-nowrap', cell: (c) => words.day(c.updatedAt) },
  ];
}

export function useChannelExportColumns(): ExportColumn<NoticeChannelDto>[] {
  const { t } = useTranslation('notices');
  const words = useNoticeWords();
  return [
    { id: 'name', header: t('channels.name'), value: (c) => words.channel(c) },
    { id: 'unit', header: t('channels.unit'), value: (c) => (c.unit ? words.unit(c.unit) : t('channels.companyWide')) },
    { id: 'status', header: t('channels.status'), value: (c) => t(c.isActive ? 'channels.active' : 'channels.disabled') },
    { id: 'writers', header: t('channels.writers'), value: (c) => c.writersCount },
    { id: 'updatedAt', header: t('channels.updatedAt'), value: (c) => formatDate(c.updatedAt) },
  ];
}

/** The filters of the list: the unit (the units that have a channel) and the state. The list is small, so it is filtered in the browser. */
export function useChannelFilterFields(channels: NoticeChannelDto[]): FilterField[] {
  const { t } = useTranslation('notices');
  const words = useNoticeWords();
  const units = [...new Map(channels.filter((c) => c.unit).map((c) => [c.unit?.id ?? '', c.unit])).values()];
  return [
    { id: 'unitId', label: t('channels.unit'), type: 'select', options: units.map((u) => ({ value: u?.id ?? '', label: words.unit(u ?? null) })) },
    { id: 'active', label: t('channels.status'), type: 'select', options: [{ value: 'true', label: t('channels.active') }, { value: 'false', label: t('channels.disabled') }] },
  ];
}

/** The channels that match the search (names in both languages, code, unit) and the filters. */
export function filterChannels(channels: NoticeChannelDto[], term: string, filters: FilterValues): NoticeChannelDto[] {
  const unit = filters.unitId;
  const active = filters.active;
  return channels.filter(
    (c) =>
      matchesText([c.nameAr, c.nameEn, c.code, c.unit?.nameAr, c.unit?.nameEn], term) &&
      (!unit || c.unit?.id === unit) &&
      (!active || String(c.isActive) === active),
  );
}
