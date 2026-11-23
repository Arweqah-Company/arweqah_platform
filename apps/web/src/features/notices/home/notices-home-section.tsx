import { CorePermission, type NoticeHomeDto, type NoticeMineItemDto } from '@arweqah-platform/shared';
import { Pin } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { usePermissions } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Badge, Button, SectionCard, StatTile } from '@/shared/ui';
import { useNoticeHome } from '../api';
import { ReadDialog } from '../mine/read-dialog';
import { ChannelBadge, needsAck, useNoticeWords } from '../shared/notice-ui';

const attention = (count: number) => (count ? 'attention' : 'neutral');

function Tile({ to, label, value, hint, tone }: { to: string; label: string; value: number; hint: string; tone?: 'neutral' | 'attention' }) {
  return (
    <Link to={to} className="block rounded-[var(--radius-panel)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link">
      <StatTile label={label} value={value} hint={hint} tone={tone} />
    </Link>
  );
}

function Tiles({ home }: { home: NoticeHomeDto }) {
  const { t } = useTranslation('notices');
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Tile to="/notices?tab=await" label={t('home.awaiting')} value={home.awaiting} hint={t('home.awaitingHint')} tone={attention(home.awaiting)} />
      <Tile to="/notices" label={t('home.newThisWeek')} value={home.newThisWeek} hint={t('home.thisWeek')} />
      {home.pendingApproval !== null && <Tile to="/notices/approvals" label={t('home.pendingApproval')} value={home.pendingApproval} hint={t('home.pendingApprovalHint')} />}
      {home.drafts !== null && <Tile to="/notices/manage?tab=mine" label={t('home.drafts')} value={home.drafts} hint={t('home.draftsHint')} />}
    </div>
  );
}

function Pinned({ notice, onRead }: { notice: NoticeMineItemDto; onRead: (id: string) => void }) {
  const { t } = useTranslation('notices');
  const words = useNoticeWords();
  return (
    <section data-tour="pinned-notice" aria-label={t('home.pinnedLabel')} className="flex flex-wrap items-start gap-4 rounded-3xl border border-neutral-200 bg-petrol-50 p-6">
      <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-petrol-800 text-cream"><Pin className="size-5" /></span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="info">{t('pinned')}</Badge><ChannelBadge channel={notice.channel} />
          <Badge tone={notice.kind === 'policy' ? 'warning' : 'neutral'}>{notice.kind === 'policy' ? t('home.policyNeedsAck') : t('kind.announcement')}</Badge>
        </div>
        <h2 className="text-xl font-bold">{words.title(notice)}</h2>
        <p className="line-clamp-2 text-sm text-muted">{notice.excerpt}</p>
        <p className="text-xs text-muted">{t('home.publishedOn', { date: words.day(notice.publishedAt) })}</p>
      </div>
      <Button variant={needsAck(notice) ? 'primary' : 'secondary'} onClick={() => onRead(notice.id)}>{needsAck(notice) ? t('read.readAndAcknowledge') : t('read.read')}</Button>
    </section>
  );
}

function AwaitingList({ items, onRead }: { items: NoticeMineItemDto[]; onRead: (id: string) => void }) {
  const { t } = useTranslation('notices');
  const words = useNoticeWords();
  return (
    <SectionCard id="home-notices-await" title={t('home.awaiting')} action={<Link to="/notices?tab=await" className="text-sm text-link hover:underline">{t('home.viewAll')}</Link>}>
      <ul className="flex flex-col gap-2 sm:col-span-2">
        {items.map((n) => (
          <li key={n.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 p-3">
            <span className="flex min-w-0 flex-col"><span className="font-medium">{words.title(n)}</span><span className="text-xs text-muted">{words.channel(n.channel)} · {words.day(n.publishedAt)}</span></span>
            <Button variant="secondary" size="sm" onClick={() => onRead(n.id)}>{t('read.readAndAcknowledge')}</Button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted sm:col-span-2">{t('home.noReminder')}</p>
    </SectionCard>
  );
}

/** The notices part of the home page: four numbers, the pinned notice and the newest policies waiting; nothing at all without `notices.view`. */
export function NoticesHomeSection() {
  const { t } = useTranslation('notices');
  const { t: tc } = useTranslation();
  const { can } = usePermissions();
  const allowed = can(CorePermission.NoticesView);
  const query = useNoticeHome(allowed);
  const [reading, setReading] = useState<string | null>(null);
  if (!allowed) return null;
  if (query.isError) return <div className="mt-8"><Alert>{errorMessage(tc, query.error)}<Button variant="secondary" size="sm" className="ms-3" onClick={() => void query.refetch()}>{tc('actions.retry')}</Button></Alert></div>;
  const home = query.data;
  if (!home) return <div role="status" aria-busy aria-label={t('loading')} className="mt-8 h-32 animate-pulse rounded-3xl bg-neutral-50" />;
  return (
    <section aria-label={t('home.title')} className="mt-8 flex flex-col gap-6">
      <h2 className="text-lg font-bold">{t('home.title')}</h2>
      <div data-tour={home.pinned ? undefined : 'pinned-notice'}><Tiles home={home} /></div>
      {home.pinned && <Pinned notice={home.pinned} onRead={setReading} />}
      {home.awaitingTop.length > 0 && <AwaitingList items={home.awaitingTop} onRead={setReading} />}
      <ReadDialog id={reading} onClose={() => setReading(null)} />
    </section>
  );
}
