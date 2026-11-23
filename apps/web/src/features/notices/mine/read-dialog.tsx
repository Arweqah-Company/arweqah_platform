import type { NoticeMineDetailsDto } from '@arweqah-platform/shared';
import { CorePermission } from '@arweqah-platform/shared';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Can } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Dialog, DialogFooter } from '@/shared/ui';
import { useAcknowledgeNotice, useMineNotice, useReadNotice } from '../api';
import { NoticeBody } from '../shared/notice-body';
import { ChannelBadge, KindBadge, needsAck, useNoticeWords } from '../shared/notice-ui';

/** True once the end of the text came into view (a short text counts at once; without the observer the end counts as reached). */
function useReachedEnd(): [boolean, (node: HTMLElement | null) => void] {
  const [reached, setReached] = useState(typeof IntersectionObserver === 'undefined');
  const node = useRef<HTMLElement | null>(null);
  const [mark, setMark] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!mark || reached) return undefined;
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setReached(true));
    observer.observe(mark);
    return () => observer.disconnect();
  }, [mark, reached]);
  return [reached, (el) => { node.current = el; setMark(el); }];
}

function AckBar({ notice, onClose }: { notice: NoticeMineDetailsDto; onClose: () => void }) {
  const { t } = useTranslation('notices');
  const { t: tc } = useTranslation();
  const ack = useAcknowledgeNotice();
  const [checked, setChecked] = useState(false);
  const [reached, markEnd] = useReachedEnd();
  const confirm = async () => {
    try {
      await ack.mutateAsync(notice.id);
      toast.success(t('read.acknowledged'));
      onClose();
    } catch {
      /* shown below */
    }
  };
  return (
    <>
      <span ref={markEnd} aria-hidden className="block h-px" />
      {ack.isError && <Alert>{errorMessage(tc, ack.error)}</Alert>}
      <DialogFooter>
        <div className="flex flex-1 flex-col gap-1">
          <label className={`flex items-center gap-2 text-sm ${reached ? '' : 'opacity-60'}`}>
            <input type="checkbox" className="size-5 accent-petrol-800" disabled={!reached} checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            {t('read.checkbox')}
          </label>
          {!reached && <span className="text-xs text-muted">{t('read.readFirst')}</span>}
        </div>
        <Button variant="secondary" onClick={onClose}>{t('read.later')}</Button>
        <Can permission={CorePermission.NoticesAcknowledge}>
          <Button disabled={!checked || ack.isPending} onClick={() => void confirm()}>{t('read.acknowledge')}</Button>
        </Can>
      </DialogFooter>
    </>
  );
}

function ReadOnlyBar({ notice, onClose }: { notice: NoticeMineDetailsDto; onClose: () => void }) {
  const { t } = useTranslation('notices');
  const words = useNoticeWords();
  const read = useReadNotice();
  const close = () => {
    if (notice.kind === 'announcement' && !notice.isArchived && !notice.readAt) read.mutate(notice.id);
    onClose();
  };
  return (
    <DialogFooter>
      {notice.isArchived && <span className="flex-1"><Alert tone="info">{t('read.archived')}</Alert></span>}
      {notice.myState === 'done' && <span className="flex-1 text-sm text-success">{t('read.doneAt', { date: words.day(notice.acknowledgedAt) })}</span>}
      <Button onClick={close}>{notice.kind === 'announcement' ? t('read.read') : t('read.close')}</Button>
    </DialogFooter>
  );
}

function Content({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useTranslation('notices');
  const { t: tc } = useTranslation();
  const query = useMineNotice(id);
  const words = useNoticeWords();
  if (query.isError) return <Alert>{errorMessage(tc, query.error)}</Alert>;
  const notice = query.data;
  if (!notice) return <div role="status" aria-busy aria-label={t('loading')} className="h-40 animate-pulse rounded-2xl bg-neutral-50" />;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2"><ChannelBadge channel={notice.channel} /><KindBadge kind={notice.kind} /></div>
      <h3 className="text-xl font-bold">{words.title(notice)}</h3>
      <NoticeBody html={notice.body} files={notice.files} base={`/notices/mine/${notice.id}`} />
      {needsAck(notice) ? <AckBar notice={notice} onClose={onClose} /> : <ReadOnlyBar notice={notice} onClose={onClose} />}
    </div>
  );
}

/** «Read and acknowledge»: the text as it arrived; for a policy the box that opens «Acknowledge», for an announcement a «Read» button. */
export function ReadDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { t } = useTranslation('notices');
  return (
    <Dialog xl open={!!id} onOpenChange={(open) => !open && onClose()} title={t('read.title')}>
      {id && <Content key={id} id={id} onClose={onClose} />}
    </Dialog>
  );
}
