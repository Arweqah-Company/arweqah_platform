import type { NoticeChannelRefDto, NoticeListItemDto, NoticeMineItemDto, NoticeMyState, NoticeStatus, NoticeType } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { formatLongDate } from '@/shared/lib/format-date';
import { Badge } from '@/shared/ui';

/** The words of a notice in the language of the screen (the Arabic title when there is no English one). */
export function useNoticeWords() {
  const { i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  return {
    ar,
    day: (iso: string | null) => (iso ? formatLongDate(iso.slice(0, 10), i18n.language) : '—'),
    title: (n: { titleAr: string; titleEn: string | null }) => (ar ? n.titleAr : n.titleEn || n.titleAr),
    channel: (c: Pick<NoticeChannelRefDto, 'nameAr' | 'nameEn'>) => (ar ? c.nameAr : c.nameEn),
    unit: (u: { nameAr: string; nameEn: string } | null) => (u ? (ar ? u.nameAr : u.nameEn) : '—'),
  };
}

/** The choices of a channel filter, from the channels the API lists (a disabled channel keeps its notices, so it stays a choice and is marked). */
export function useChannelFilterOptions(channels: readonly NoticeChannelRefDto[] | undefined): { value: string; label: string }[] {
  const { t } = useTranslation('notices');
  const words = useNoticeWords();
  return (channels ?? []).map((c) => ({ value: c.code, label: c.isActive === false ? `${words.channel(c)} (${t('channels.disabled')})` : words.channel(c) }));
}

export function KindBadge({ kind }: { kind: NoticeType }) {
  const { t } = useTranslation('notices');
  return <Badge tone={kind === 'policy' ? 'warning' : 'neutral'}>{t(`kind.${kind}`)}</Badge>;
}

export function ChannelBadge({ channel }: { channel: NoticeChannelRefDto }) {
  const words = useNoticeWords();
  return <Badge tone="info">{words.channel(channel)}</Badge>;
}

const STATUS_TONES: Record<NoticeStatus, 'neutral' | 'warning' | 'info' | 'success' | 'danger'> = {
  draft: 'neutral',
  pending_approval: 'warning',
  approved: 'info',
  published: 'success',
  revising: 'warning',
  rejected: 'danger',
  archived: 'neutral',
};

/** The status, and for a published notice whose new version is being written or reviewed the «hidden from employees» mark too. */
export function StatusBadges({ notice }: { notice: Pick<NoticeListItemDto, 'status' | 'hiddenForRevision' | 'isPinned'> }) {
  const { t } = useTranslation('notices');
  const hidden = notice.hiddenForRevision;
  return (
    <span className="flex flex-wrap items-center gap-1">
      {hidden ? <Badge tone="warning">{t('status.hiddenForRevision')}</Badge> : <Badge tone={STATUS_TONES[notice.status]}>{t(`status.${notice.status}`)}</Badge>}
      {hidden && notice.status !== 'revising' && <Badge tone={STATUS_TONES[notice.status]}>{t(`status.${notice.status}`)}</Badge>}
      {notice.isPinned && <Badge tone="info">{t('pinned')}</Badge>}
    </span>
  );
}

export function MyStateBadge({ state, olderVersion }: { state: NoticeMyState; olderVersion?: boolean }) {
  const { t } = useTranslation('notices');
  const tone = state === 'await' ? 'warning' : state === 'done' ? 'success' : 'neutral';
  return <Badge tone={tone}>{olderVersion && state === 'await' ? t('myState.awaitNew') : t(`myState.${state}`)}</Badge>;
}

export const needsAck = (n: Pick<NoticeMineItemDto, 'kind' | 'myState' | 'isArchived'>) => n.kind === 'policy' && n.myState === 'await' && !n.isArchived;
