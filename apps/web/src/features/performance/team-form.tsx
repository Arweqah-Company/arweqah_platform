import { type SaveTeamEvaluationInput, type TeamEvaluationDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { FormField, Input } from '@/shared/ui';
import { formatHours } from './format-hours';
import { BehaviourField, Picks } from './self-form';
import { withResult, type formErrors } from './team-form-state';

type Errors = ReturnType<typeof formErrors>;
interface PartProps {
  dto: TeamEvaluationDto;
  form: SaveTeamEvaluationInput;
  onChange: (next: SaveTeamEvaluationInput) => void;
  tried: boolean;
  errors: Errors;
  locked: boolean;
}

/** One score (0..100) for each results criterion, with its share, and the rule the stage gives for turning an indicator into a score. */
export function ResultsPart({ dto, form, onChange, tried, errors, locked }: PartProps) {
  const { t } = useTranslation('performance');
  return (
    <section className="flex flex-col gap-3" aria-label={t('team.results')}>
      <h3 className="font-heading text-base font-bold text-fg">{t('team.results')}</h3>
      {dto.template.ruleText && <p className="text-sm text-muted">{dto.template.ruleText}</p>}
      {dto.template.resultsNote && <p className="text-sm text-muted">{dto.template.resultsNote}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {dto.template.criteria.map((c, i) => (
          <FormField key={c.name} label={`${c.name} (${c.share}%)`} hint={t('team.resultHint')} error={tried && errors[`results.${i}`] ? t('team.resultInvalid') : undefined}>
            {(p) => (
              <Input {...p} type="number" min={0} max={100} step="any" dir="ltr" disabled={locked} value={form.results[String(i)] ?? ''}
                onChange={(e) => onChange({ ...form, results: withResult(form.results, i, e.target.value) })} />
            )}
          </FormField>
        ))}
      </div>
    </section>
  );
}

/** The behaviours with the level and note of the manager, and above each what the employee (and, for the upper manager, the direct manager) wrote. */
export function BehavioursPart({ dto, form, onChange, tried, locked }: PartProps) {
  const { t } = useTranslation('performance');
  const said = (level: number | undefined, note: string | undefined, who: string) => (level === undefined ? null : <span className="text-sm text-muted">{t('team.said', { who, level: t(`self.levels.${level}`) })}{note ? ` · ${note}` : ''}</span>);
  return (
    <section className="flex flex-col gap-3" aria-label={t('self.behavioursTitle')}>
      <h3 className="font-heading text-base font-bold text-fg">{t('self.behavioursTitle')}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {dto.template.behaviours.map((b) => {
          const mine = dto.self.behaviours[b.code];
          const first = dto.directForm?.behaviours[b.code];
          const aside = <>{said(mine?.level, mine?.note, t('team.theEmployee'))}{said(first?.level, first?.note, dto.directManagerName ?? t('team.direct'))}</>;
          return <BehaviourField key={b.code} code={b.code} name={b.name} question={b.question} value={form.behaviours[b.code]} tried={tried} label={t('team.yourLevel')} aside={aside} locked={locked}
            onChange={(next) => onChange({ ...form, behaviours: { ...form.behaviours, [b.code]: next } })} />;
        })}
      </div>
    </section>
  );
}

/** The extra component: the learning card (by itself) and the catalog items, those the employee claimed marked. */
export function ExtraPart({ dto, form, onChange, locked }: PartProps) {
  const { t } = useTranslation('performance');
  const kind = (k: 'init' | 'growth') => dto.catalog.filter((c) => c.kind === k);
  const claimed = [...dto.self.initIds, ...dto.self.growthIds];
  return (
    <section className="flex flex-col gap-3" aria-label={t('evaluation.extra')}>
      <h3 className="font-heading text-base font-bold text-fg">{t('evaluation.extra')}</h3>
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3"><b className="text-fg">{dto.template.extra[0]?.name ?? t('self.learning')} ({t('self.auto')})</b><p className="text-sm text-muted">{t('self.learningCard', { done: formatHours(dto.learning.approvedMinutes), of: formatHours(dto.learning.stageMinutes) })}</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Picks title={t('catalog.kinds.init')} items={kind('init')} picked={form.initIds} claimed={claimed} locked={locked} onChange={(initIds) => onChange({ ...form, initIds })} />
        <Picks title={t('catalog.kinds.growth')} items={kind('growth')} picked={form.growthIds} claimed={claimed} locked={locked} onChange={(growthIds) => onChange({ ...form, growthIds })} />
      </div>
    </section>
  );
}

