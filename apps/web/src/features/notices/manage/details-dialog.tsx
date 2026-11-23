import { CorePermission, type NoticeDetailsDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Can, usePermissions } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Dialog, DialogFooter, Tabs } from '@/shared/ui';
import { useNotice } from '../api';
import { ChannelBadge, KindBadge, StatusBadges, useNoticeWords } from '../shared/notice-ui';
import { AcksTab } from './acks-tab';
import { AudienceTab, FlowTab, TextTab } from './details-tabs';
import type { NoticeCommand } from './notice-commands';

type DetailsTab = 'text' | 'flow' | 'audience' | 'acks';

function Header({ notice }: { notice: NoticeDetailsDto }) {
  const { t } = useTranslation('notices');
  const words = useNoticeWords();
  return (
    <div className="mb-4 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2"><ChannelBadge channel={notice.channel} /><KindBadge kind={notice.kind} /><StatusBadges notice={notice} /></div>
      <h3 className="text-xl font-bold">{words.title(notice)}</h3>
      <p className="text-sm text-muted">{t('details.byline', { author: notice.author.name })}{notice.publishedAt ? ` · ${t('details.publishedOn', { date: words.day(notice.publishedAt) })}` : ''}</p>
      {notice.status === 'rejected' && notice.rejectReason && <Alert tone="danger">{t('flow.reason', { reason: notice.rejectReason })}</Alert>}
    </div>
  );
}

function Actions({ notice, run, onClose }: { notice: NoticeDetailsDto; run: (c: NoticeCommand, n: NoticeDetailsDto) => void; onClose: () => void }) {
  const { t } = useTranslation('notices');
  const act = (command: NoticeCommand) => () => {
    onClose();
    run(command, notice);
  };
  return (
    <DialogFooter>
      <Button variant="secondary" onClick={onClose}>{t('details.close')}</Button>
      {notice.abilities.reject && <Can permission={CorePermission.NoticesReject}><Button variant="danger" onClick={act('reject')}>{t('actions.reject')}</Button></Can>}
      {notice.abilities.approve && <Can permission={CorePermission.NoticesApprove}><Button onClick={act('approve')}>{t('actions.approve')}</Button></Can>}
    </DialogFooter>
  );
}

function Content({ id, run, onClose }: { id: string; run: (c: NoticeCommand, n: NoticeDetailsDto) => void; onClose: () => void }) {
  const { t } = useTranslation('notices');
  const { t: tc } = useTranslation();
  const query = useNotice(id);
  const { can } = usePermissions();
  const [tab, setTab] = useState<DetailsTab>('text');
  if (query.isError) return <Alert>{errorMessage(tc, query.error)}</Alert>;
  const notice = query.data;
  if (!notice) return <div role="status" aria-busy aria-label={t('loading')} className="h-40 animate-pulse rounded-2xl bg-neutral-50" />;
  const showAcks = notice.canSeeAcknowledgements && can(CorePermission.NoticesAckReport);
  const tabs = (['text', 'flow', 'audience', ...(showAcks ? ['acks'] : [])] as DetailsTab[]).map((x) => ({ id: x, label: x === 'acks' && notice.ack ? `${t('tabs.acks')} · ${notice.ack.percent}%` : t(`tabs.${x}`) }));
  return (
    <div>
      <Header notice={notice} />
      <Tabs tabs={tabs} value={tab} label={t('details.tabsLabel')} onChange={setTab} />
      {tab === 'text' && <TextTab notice={notice} />}
      {tab === 'flow' && <FlowTab id={notice.id} />}
      {tab === 'audience' && <AudienceTab id={notice.id} />}
      {tab === 'acks' && <AcksTab id={notice.id} />}
      <Actions notice={notice} run={run} onClose={onClose} />
    </div>
  );
}

/** The notice in four tabs (text, approval, audience, acknowledgements); the last needs `notices.ack_report`. */
export function NoticeDetailsDialog({ id, onClose, run }: { id: string | null; onClose: () => void; run: (c: NoticeCommand, n: NoticeDetailsDto) => void }) {
  const { t } = useTranslation('notices');
  return (
    <Dialog xl open={!!id} onOpenChange={(open) => !open && onClose()} title={t('details.title')}>
      {id && <Content key={id} id={id} run={run} onClose={onClose} />}
    </Dialog>
  );
}
