import type { NoticeMineItemDto } from '@arweqah-platform/shared';
import { CorePermission } from '@arweqah-platform/shared';
import { CalendarDays, Pin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/core/permissions/can';
import { Button } from '@/shared/ui';
import { ChannelBadge, KindBadge, MyStateBadge, needsAck, useNoticeWords } from '../shared/notice-ui';

/** One notice of «My notices» in the cards view: its type and channel, the title, the date, my state, and the one action that fits (read, or read and acknowledge). */
export function NoticeCard({ notice, onOpen }: { notice: NoticeMineItemDto; onOpen: (id: string) => void }) {
  const { t } = useTranslation('notices');
  const words = useNoticeWords();
  const owes = needsAck(notice);
  return (
    <article className="flex h-full flex-col gap-3" aria-label={words.title(notice)}>
      <div className="flex flex-wrap items-center gap-2">
        <KindBadge kind={notice.kind} />
        <ChannelBadge channel={notice.channel} />
        {notice.isPinned && <span className="inline-flex items-center gap-1 text-xs text-muted"><Pin className="size-3.5" aria-hidden />{t('pinned')}</span>}
      </div>
      <h3 className="text-base font-bold text-fg">{words.title(notice)}</h3>
      <p className="flex items-center gap-1.5 text-xs text-muted"><CalendarDays className="size-3.5" aria-hidden />{words.day(notice.publishedAt)}</p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 pt-3">
        <MyStateBadge state={notice.myState} olderVersion={notice.acknowledgedOlderVersion} />
        <Can permission={CorePermission.NoticesView}>
          <Button size="sm" variant={owes ? 'primary' : 'secondary'} onClick={() => onOpen(notice.id)}>{owes ? t('read.readAndAcknowledge') : t('read.read')}</Button>
        </Can>
      </div>
    </article>
  );
}
