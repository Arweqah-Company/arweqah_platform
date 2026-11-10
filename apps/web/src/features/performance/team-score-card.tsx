import type { GradeBand, ScoreParts } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui';

/** The live card of the evaluation window: the final score out of the cap, its level, and the parts the formula adds (so the manager sees what each field does). */
export function TeamScoreCard({ score, band, cap }: { score: ScoreParts; band: GradeBand | null; cap: number }) {
  const { t } = useTranslation('performance');
  const parts: [string, number][] = [['results', score.results], ['behaviour', score.behaviour], ['basic', score.basic], ['learning', score.learning], ['init', score.init], ['growth', score.growth]];
  return (
    <section aria-label={t('team.card.title')} className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-petrol-50 p-4" data-tour="performance-team-card">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-heading text-3xl font-bold text-fg" dir="ltr" aria-live="polite">{score.final}</span>
        <span className="text-muted">{t('team.card.outOf', { cap })}</span>
        {band && <Badge tone="info">{band.name}</Badge>}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
        {parts.map(([key, value]) => (
          <div key={key} className="flex items-baseline justify-between gap-2"><dt className="text-muted">{t(`team.card.${key}`)}</dt><dd className="font-medium text-fg" dir="ltr">{value}</dd></div>
        ))}
      </dl>
      <p className="text-sm text-muted">{t('team.card.formula')}</p>
    </section>
  );
}
