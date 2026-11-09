import { useTranslation } from 'react-i18next';
import { useMyProgress } from './api';
import { formatMinutes } from './format-minutes';

/** One number with its bar (the cards on top of the employee's page). */
function Tile({ label, value, ratio, tone }: { label: string; value: string; ratio: number; tone: 'link' | 'success' }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-3xl border border-neutral-200 bg-white p-4">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-2xl font-bold tabular-nums text-fg">{value}</span>
      <progress className={tone === 'success' ? 'h-2.5 w-full accent-green-800' : 'h-2.5 w-full accent-petrol-800'} value={Math.round(ratio * 100)} max={100} aria-label={label} />
    </div>
  );
}

/** The units whose proof was approved, and the approved hours with the next medal: the numbers of the plan, from the proofs the reviewers approved. */
export function ProgressTiles() {
  const { t } = useTranslation('career-profile');
  const progress = useMyProgress().data;
  if (!progress) return null;
  const next = progress.nextBadge;
  return (
    <div className="grid gap-3 sm:grid-cols-2" data-tour="career-progress">
      <Tile label={t('tiles.units')} value={t('tiles.unitsValue', { done: progress.unitsDone, total: progress.unitsTotal })} ratio={progress.unitsTotal ? progress.unitsDone / progress.unitsTotal : 0} tone="success" />
      <Tile
        label={next ? t('tiles.hoursNext', { name: next.name, hours: next.hours }) : t('tiles.hours')}
        value={formatMinutes(progress.approvedMinutes, t)}
        ratio={next ? progress.approvedMinutes / (next.hours * 60) : 1}
        tone="link"
      />
    </div>
  );
}
