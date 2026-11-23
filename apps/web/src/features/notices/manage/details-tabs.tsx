import type { NoticeAudienceRuleDto, NoticeDetailsDto, NoticeVersionDto } from '@arweqah-platform/shared';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, SegmentedControl } from '@/shared/ui';
import { useNoticeAudience, useNoticeFlow } from '../api';
import { NoticeBody } from '../shared/notice-body';
import { useNoticeWords } from '../shared/notice-ui';

type VersionView = `v${number}` | 'compare';

/** The text as it will reach people; with a new version waiting, a switch between the versions and a side-by-side comparison. */
export function TextTab({ notice }: { notice: NoticeDetailsDto }) {
  const { t } = useTranslation('notices');
  const words = useNoticeWords();
  const versions = notice.versions;
  const [view, setView] = useState<VersionView>(`v${notice.version}`);
  const base = `/notices/${notice.id}`;
  const show = (v: NoticeVersionDto) => (
    <div className="flex min-w-0 flex-col gap-2">
      <h4 className="font-bold">{t('details.versionN', { n: v.version })} · {words.title(v)}</h4>
      <NoticeBody html={v.body} files={v.files} base={base} />
    </div>
  );
  if (versions.length < 2) return <NoticeBody html={notice.body} files={notice.files} base={base} />;
  const choices = [...versions.map((v) => ({ id: `v${v.version}` as VersionView, label: t('details.versionN', { n: v.version }) })), { id: 'compare' as VersionView, label: t('details.compare') }];
  const chosen = versions.find((v) => `v${v.version}` === view);
  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl value={view} onChange={setView} choices={choices} label={t('details.versions')} />
      {chosen ? show(chosen) : <div className="grid gap-4 md:grid-cols-2">{versions.map((v) => <div key={v.version}>{show(v)}</div>)}</div>}
    </div>
  );
}

function Dot({ done }: { done: boolean }) {
  return <span aria-hidden className={`mt-1 grid size-5 shrink-0 place-items-center rounded-full ${done ? 'bg-green-400 text-ink' : 'border-2 border-dashed border-neutral-500'}`}>{done && <Check className="size-3" />}</span>;
}

/** The timeline: written, sent, approved or rejected (who, when, why), published (batches and people), acknowledgement running, versions. */
export function FlowTab({ id }: { id: string }) {
  const { t } = useTranslation('notices');
  const { t: tc } = useTranslation();
  const words = useNoticeWords();
  const flow = useNoticeFlow(id);
  if (flow.isError) return <Alert>{errorMessage(tc, flow.error)}</Alert>;
  if (!flow.data) return <div role="status" aria-busy aria-label={t('loading')} className="h-32 animate-pulse rounded-2xl bg-neutral-50" />;
  const { steps, approver, approverUnit, delivery, ack } = flow.data;
  return (
    <ol className="flex flex-col gap-4">
      {steps.map((s) => (
        <li key={`${s.event}-${s.at}`} className="flex gap-3">
          <Dot done />
          <div className="flex flex-col text-sm">
            <span className="font-medium">{t(`flow.${s.event}`, { n: s.version ?? '' })}</span>
            <span className="text-xs text-muted">{[s.actor?.name, s.event === 'approved' || s.event === 'rejected' ? words.unit(approverUnit) : null, words.day(s.at)].filter((x) => x && x !== '—').join(' · ')}</span>
            {s.reason && <span className="mt-1 rounded-xl bg-danger-50 p-2 text-xs">{t('flow.reason', { reason: s.reason })}</span>}
          </div>
        </li>
      ))}
      {!steps.some((s) => s.event === 'approved' || s.event === 'rejected') && approver && (
        <li className="flex gap-3"><Dot done={false} /><span className="text-sm text-muted">{t('flow.waitingFor', { name: approver.name })}</span></li>
      )}
      {delivery.recipients > 0 && (
        <li className="flex gap-3"><Dot done={delivery.completed} /><span className="text-sm">{t('flow.delivery', { batches: delivery.batchesDone, people: delivery.recipients })}</span></li>
      )}
      {ack && <li className="flex gap-3"><Dot done={ack.percent === 100} /><span className="text-sm">{t('flow.ack', { done: ack.acknowledged, total: ack.total })}</span></li>}
    </ol>
  );
}

function RuleLine({ rule }: { rule: NoticeAudienceRuleDto }) {
  const { t } = useTranslation('notices');
  const words = useNoticeWords();
  const name = rule.type === 'all' ? t('details.everyone') : words.ar ? rule.nameAr : rule.nameEn;
  return <li className="flex flex-wrap items-center gap-2 rounded-xl bg-neutral-50 px-3 py-2 text-sm"><span className="font-medium">{t(`details.rule.${rule.type}`)}</span><span>{name}</span>{rule.type === 'unit' && rule.includeBelow && <span className="text-xs text-muted">{t('details.andBelow')}</span>}</li>;
}

/** The audience rules, how many people the notice reached and how many joined after the publication. */
export function AudienceTab({ id }: { id: string }) {
  const { t } = useTranslation('notices');
  const { t: tc } = useTranslation();
  const report = useNoticeAudience(id);
  if (report.isError) return <Alert>{errorMessage(tc, report.error)}</Alert>;
  if (!report.data) return <div role="status" aria-busy aria-label={t('loading')} className="h-32 animate-pulse rounded-2xl bg-neutral-50" />;
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">{report.data.rules.map((r) => <RuleLine key={`${r.type}-${r.refId}`} rule={r} />)}</ul>
      <p className="text-sm">{t('details.reached', { count: report.data.recipients })}</p>
      <p className="text-sm text-muted">{t('details.joinedLater', { count: report.data.joinedAfterPublish })}</p>
    </div>
  );
}
