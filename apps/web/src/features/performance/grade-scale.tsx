import type { GradeBand } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui';

/** The tone of a band from its place on the scale: the lowest is red, the next orange, the middle blue, the two above green. */
const TONES = ['danger', 'warning', 'info', 'success', 'success'] as const;

/** The grade scale as steps: the lowest band at the start of the row, each one higher than the one before it, with its range and what it means. */
export function GradeScale({ bands, cap }: { bands: GradeBand[]; cap: number }) {
  const { t } = useTranslation('performance');
  const lowToHigh = [...bands].reverse();
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-heading text-base font-bold text-fg">{t('evaluation.scale', { cap })}</h3>
      <ol className="grid items-end gap-2 sm:grid-cols-5" aria-label={t('evaluation.scaleLabel')}>
        {lowToHigh.map((b, i) => (
          <li key={b.name} className={`flex flex-col gap-1 rounded-2xl border border-neutral-200 bg-white p-3 ${HEIGHTS[i] ?? ''}`}>
            <b className="text-fg">{b.name}</b>
            <Badge tone={TONES[i] ?? 'neutral'}>{t('evaluation.final')} {b.range}</Badge>
            <span className="text-sm text-muted">{b.description}</span>
          </li>
        ))}
      </ol>
      <p className="text-sm text-muted">{t('evaluation.scaleDirection')}</p>
    </div>
  );
}

/** Each step stands a little higher than the one before it (fixed steps, so a long description grows its own step and is never cut). */
const HEIGHTS = ['sm:min-h-32', 'sm:min-h-40', 'sm:min-h-48', 'sm:min-h-56', 'sm:min-h-64'];
