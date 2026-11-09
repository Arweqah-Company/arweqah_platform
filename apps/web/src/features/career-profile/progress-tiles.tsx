import { useTranslation } from 'react-i18next';
import { useMyProgress } from './api';
import { formatMinutes } from './format-minutes';

const TONE_CLASS = { success: 'h-2.5 w-full accent-green-800', link: 'h-2.5 w-full accent-petrol-800', warning: 'h-2.5 w-full accent-orange-700' } as const;

/** One number with its bar (the cards on top of the employee's page). */
function Tile({ label, value, ratio, tone }: { label: string; value: string; ratio: number; tone: 'link' | 'success' | 'warning' }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-3xl border border-neutral-200 bg-white p-4">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-2xl font-bold tabular-nums text-fg">{value}</span>
      <progress className={TONE_CLASS[tone]} value={Math.round(ratio * 100)} max={100} aria-label={label} />
    </div>
  );
}

/** The budget spent of the yearly cap of the stage, as a card (the cap is empty when no rule covers the title). */
function BudgetTile({ budget }: { budget: NonNullable<ReturnType<typeof useMyProgress>['data']>['budget'] }) {
  const { t } = useTranslation('career-profile');
  const { cap, spent } = budget;
  const ratio = cap ? spent / cap : 0; // the text shows the real share (an overspend is a warning, not a cap); the bar is clamped by its own max
  const amount = (n: number) => n.toLocaleString('en');
  return <Tile label={cap ? t('tiles.budget', { spent: amount(spent), cap: amount(cap) }) : t('tiles.budgetNoCap', { spent: amount(spent) })} value={cap ? t('tiles.budgetValue', { percent: Math.round(ratio * 100) }) : amount(spent)} ratio={Math.min(1, ratio)} tone="warning" />;
}

/** The units whose proof was approved, and the approved hours with the next medal: the numbers of the plan, from the proofs the reviewers approved. */
export function ProgressTiles() {
  const { t } = useTranslation('career-profile');
  const progress = useMyProgress().data;
  if (!progress) return null;
  const next = progress.nextBadge;
  const met = progress.competencies.filter((c) => c.met);
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-tour="career-progress">
      <Tile label={t('tiles.units')} value={t('tiles.unitsValue', { done: progress.unitsDone, total: progress.unitsTotal })} ratio={progress.unitsTotal ? progress.unitsDone / progress.unitsTotal : 0} tone="success" />
      <Tile
        label={next ? t('tiles.hoursNext', { name: next.name, hours: next.hours }) : t('tiles.hours')}
        value={formatMinutes(progress.approvedMinutes, t)}
        ratio={next ? progress.approvedMinutes / (next.hours * 60) : 1}
        tone="link"
      />
      <BudgetTile budget={progress.budget} />
      <Tile label={t('tiles.competencies')} value={t('tiles.competenciesValue', { met: met.length, total: progress.competencies.length })} ratio={progress.competencies.length ? met.length / progress.competencies.length : 0} tone="success" />
    </div>
  );
}
