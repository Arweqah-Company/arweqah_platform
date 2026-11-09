import type { MyEvaluationDto } from '@arweqah-platform/shared';
import { Clock, Lock, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button } from '@/shared/ui';
import { SelfForm } from './self-form';

type Evaluation = NonNullable<MyEvaluationDto['evaluation']>;

/** What the employee sent: each behaviour with the level and the note they gave it. */
function SentTable({ evaluation }: { evaluation: Evaluation }) {
  const { t } = useTranslation('performance');
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200">
      <table className="w-full min-w-[28rem] text-sm">
        <caption className="sr-only">{t('self.sentTitle')}</caption>
        <thead className="bg-neutral-50 text-muted"><tr><th scope="col" className="px-3 py-2 text-start font-medium">{t('self.behaviour')}</th><th scope="col" className="px-3 py-2 text-start font-medium">{t('self.level')}</th><th scope="col" className="px-3 py-2 text-start font-medium">{t('self.note')}</th></tr></thead>
        <tbody>
          {evaluation.template.behaviours.map((b) => {
            const v = evaluation.self.behaviours[b.code];
            return <tr key={b.code} className="border-t border-neutral-200"><td className="px-3 py-2 text-fg">{b.name}</td><td className="px-3 py-2">{v?.level === undefined ? '—' : <Badge tone="neutral">{t(`self.levels.${v.level}`)}</Badge>}</td><td className="px-3 py-2 text-fg">{v?.note || '—'}</td></tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Where the form stands: sent, a draft (something rated and not sent), or not started. */
export function selfState(evaluation: Evaluation): 'sent' | 'draft' | 'none' {
  if (evaluation.self.sentAt) return 'sent';
  return Object.keys(evaluation.self.behaviours).length > 0 ? 'draft' : 'none';
}

/** The status card: not started, a draft, or sent; with the button to start or change it while it can be changed. */
function StatusCard({ mine, evaluation, onEdit }: { mine: MyEvaluationDto; evaluation: Evaluation; onEdit: () => void }) {
  const { t } = useTranslation('performance');
  const state = selfState(evaluation);
  const sent = state === 'sent';
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="min-w-[14rem] flex-1">
        <b className="text-fg">{t(`self.status.${state}.title`)}</b>
        <p className="text-sm text-muted">{sent ? t('self.status.sent.body', { manager: evaluation.managerName ?? t('self.status.noManager') }) : t('self.status.none.body', { date: mine.cycle?.selfDeadline ?? t('self.status.noDate') })}</p>
      </div>
      <Badge tone={sent ? 'success' : 'warning'}>{t(`self.status.${state}.badge`)}</Badge>
      {evaluation.editable && <Button onClick={onEdit}><Pencil className="size-4" aria-hidden />{t(sent ? 'self.edit' : 'self.start')}</Button>}
    </div>
  );
}

/** The tab «my evaluation»: the status card, the form while it is open, what was sent, and the notice that the scores wait for the notification. */
export function MyEvaluation({ mine, evaluation }: { mine: MyEvaluationDto; evaluation: Evaluation }) {
  const { t } = useTranslation('performance');
  const [editing, setEditing] = useState(false);
  const stage = mine.cycle?.stage ?? 'self';
  if (editing && evaluation.editable) return <SelfForm evaluation={evaluation} onClose={() => setEditing(false)} />;
  return (
    <div className="flex flex-col gap-4">
      <StatusCard mine={mine} evaluation={evaluation} onEdit={() => setEditing(true)} />
      {evaluation.self.sentAt && <SentTable evaluation={evaluation} />}
      {!evaluation.editable && <Alert tone="info"><Lock className="me-1 inline size-4" aria-hidden />{t('self.underReview', { stage: t(`stages.${stage}.title`) })} <b>{t('self.noScores')}</b></Alert>}
      {evaluation.editable && stage === 'mgr' && <Alert tone="info"><Clock className="me-1 inline size-4" aria-hidden />{t('self.managerStage')}</Alert>}
    </div>
  );
}
