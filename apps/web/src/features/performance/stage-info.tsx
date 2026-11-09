import type { StageTemplate } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Badge, ProgressSplit, type SplitPart } from '@/shared/ui';

const FILLS: SplitPart['fill'][] = ['fill-petrol-800', 'fill-green-400', 'fill-neutral-500'];

/** The weights of the stage: the basic part (results and behaviour) and the extra components as bars, the cap, and the criteria of the results with their shares. */
export function WeightsTab({ template }: { template: StageTemplate }) {
  const { t } = useTranslation('performance');
  const basic: SplitPart[] = [{ key: 'r', label: `${t('evaluation.results')} ${template.resultsWeight}%`, value: template.resultsWeight, fill: FILLS[0]! }, { key: 'b', label: `${t('evaluation.behaviour')} ${template.behaviourWeight}%`, value: template.behaviourWeight, fill: FILLS[1]! }];
  const extra: SplitPart[] = template.extra.map((x, i) => ({ key: x.name, label: `${x.name} ${x.points}%`, value: x.points, fill: FILLS[i % FILLS.length]! }));
  const stage = { stage: template.stage, name: template.name };
  return (
    <div className="flex flex-col gap-4">
      {template.ruleText && <p className="text-fg">{template.ruleText}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-3" aria-labelledby="w-basic">
          <h3 id="w-basic" className="font-heading text-base font-bold text-fg">{t('evaluation.basic', { total: template.basicTotal })}</h3>
          <ProgressSplit parts={basic} label={t('evaluation.basic', { total: template.basicTotal })} />
          <h3 className="mt-2 font-heading text-base font-bold text-fg">{t('evaluation.extra')}</h3>
          <ProgressSplit parts={extra} label={t('evaluation.extra')} />
          <p className="text-sm text-muted">{t('evaluation.cap', { cap: template.cap })}</p>
        </section>
        <section className="flex flex-col gap-2" aria-labelledby="w-criteria">
          <h3 id="w-criteria" className="font-heading text-base font-bold text-fg">{t('evaluation.criteria', { weight: template.resultsWeight, ...stage })}</h3>
          <p className="text-sm text-muted">{t('evaluation.criteriaHint')}</p>
          {template.criteria.map((c) => <div key={c.name} className="flex items-center gap-2"><span className="min-w-12 text-center"><Badge tone="info">{c.share}%</Badge></span><span className="text-fg">{c.name}</span></div>)}
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
      <h3 className="font-heading text-base font-bold text-fg">{t('evaluation.behaviours', { weight: template.behaviourWeight, stage: template.stage, name: template.name })}</h3>
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
