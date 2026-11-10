import { CorePermission, type MyResultDto } from '@arweqah-platform/shared';
import { MessageSquareWarning, Printer } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/core/permissions/can';
import { formatLongDate } from '@/shared/lib/format-date';
import { Alert, Badge, Button } from '@/shared/ui';
import { GradeScale } from './grade-scale';
import { ObjectionDialog } from './objection-dialog';
import { BehavioursTable, CriteriaTable, ExtraTable } from './result-tables';

const OBJECTION_TONE = { open: 'info', returned: 'info', reevaluated: 'info', finalized: 'success', rejected: 'warning' } as const;

/** Where the objection stands, in words the employee reads (and the reason when it was refused). */
function ObjectionStatus({ result }: { result: MyResultDto }) {
  const { t } = useTranslation('performance');
  const o = result.objection;
  if (!o) return null;
  return <Alert tone={OBJECTION_TONE[o.status]}><b>{t(`result.objection.${o.status}`)}</b>{o.decisionReason ? `: ${o.decisionReason}` : ''}</Alert>;
}

/** «My result» (after the individual notification): the score and its level, the grade scale with my place, my scores, the behaviours, the extra component, the objection, and a printable copy. */
export function MyResult({ result }: { result: MyResultDto }) {
  const { t, i18n } = useTranslation('performance');
  const [objecting, setObjecting] = useState(false);
  const cap = result.template.cap;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="min-w-[12rem] flex-1">
          <p className="text-sm text-muted">{t('result.yourScore')}</p>
          <p className="text-4xl font-bold text-fg" dir="ltr">{result.finalScore}<span className="text-lg font-normal text-muted"> / {cap}</span></p>
        </div>
        {result.levelName && <Badge tone="success">{result.levelName}</Badge>}
        <Can permission={CorePermission.PerformanceExport}><Button variant="secondary" className="print:hidden" onClick={() => window.print()}><Printer className="size-4" aria-hidden />{t('result.export')}</Button></Can>
      </div>
      <GradeScale bands={result.scale} cap={cap} score={result.finalScore} />
      <CriteriaTable result={result} />
      <BehavioursTable result={result} />
      <ExtraTable result={result} />
      <ObjectionStatus result={result} />
      {result.canObject && (
        <div className="print:hidden"><Alert tone="info">
          {t('result.window', { date: result.objectionUntil ? formatLongDate(result.objectionUntil, i18n.language) : '—' })}
          <Can permission={CorePermission.PerformanceObject}><Button className="ms-3" variant="secondary" onClick={() => setObjecting(true)}><MessageSquareWarning className="size-4" aria-hidden />{t('result.object')}</Button></Can>
        </Alert></div>
      )}
      {objecting && <ObjectionDialog result={result} onClose={() => setObjecting(false)} />}
    </div>
  );
}
