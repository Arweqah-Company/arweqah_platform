import type { StageTemplate } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui';

/** One weight with its bar: what part of the whole it is. */
function Weight({ label, value, total }: { label: string; value: number; total: number }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between gap-2 text-sm"><span className="text-fg">{label}</span><b dir="ltr" className="tabular-nums text-fg">{value}%</b></div>
      <progress className="h-2.5 w-full accent-petrol-800" value={value} max={total} aria-label={label} />
    </div>
  );
}

/** The weights of the stage: the basic part (results and behaviour), the extra components, the cap, and the criteria of the results with their shares. */
export function WeightsTab({ template }: { template: StageTemplate }) {
  const { t } = useTranslation('performance');
  return (
    <div className="flex flex-col gap-4">
      {template.ruleText && <p className="text-fg">{template.ruleText}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-3" aria-labelledby="w-basic">
          <h3 id="w-basic" className="font-heading text-base font-bold text-fg">{t('evaluation.basic', { total: template.basicTotal })}</h3>
          <Weight label={t('evaluation.results')} value={template.resultsWeight} total={template.basicTotal} />
          <Weight label={t('evaluation.behaviour')} value={template.behaviourWeight} total={template.basicTotal} />
          <h3 className="mt-2 font-heading text-base font-bold text-fg">{t('evaluation.extra')}</h3>
          {template.extra.map((x) => <Weight key={x.name} label={x.name} value={x.points} total={template.cap - template.basicTotal} />)}
          <p className="text-sm text-muted">{t('evaluation.cap', { cap: template.cap })}</p>
        </section>
        <section className="flex flex-col gap-2" aria-labelledby="w-criteria">
          <h3 id="w-criteria" className="font-heading text-base font-bold text-fg">{t('evaluation.criteria', { weight: template.resultsWeight })}</h3>
          <p className="text-sm text-muted">{t('evaluation.criteriaHint')}</p>
          {template.criteria.map((c) => <div key={c.name} className="flex items-center gap-2"><Badge tone="info">{c.share}%</Badge><span className="text-fg">{c.name}</span></div>)}
          {template.resultsNote && <p className="text-sm text-muted">{template.resultsNote}</p>}
        </section>
      </div>
    </div>
  );
}

/** The behaviours of the stage with the question the evaluator asks about each. */
export function BehavioursTab({ template }: { template: StageTemplate }) {
  const { t } = useTranslation('performance');
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-heading text-base font-bold text-fg">{t('evaluation.behaviours', { weight: template.behaviourWeight })}</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {template.behaviours.map((b) => (
          <div key={b.code} className="flex flex-col gap-1 rounded-2xl border border-neutral-200 bg-white p-3">
            <span dir="ltr" className="text-xs text-muted">{b.code}</span>
            <b className="text-fg">{b.name}</b>
            <span className="text-sm text-muted">{t('evaluation.question')}: {b.question}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
