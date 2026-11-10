import type { CalibrationDistributionDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';

/** The people per level of the calibrated score: the level's name at the start edge, a bar from it as long as the count, and the count at the end (so, in Arabic, the lowest level is at the right). */
export function CalibrationDistribution({ distribution }: { distribution: CalibrationDistributionDto[] }) {
  const { t } = useTranslation('performance');
  const max = Math.max(1, ...distribution.map((d) => d.count));
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4" aria-label={t('calibration.distribution')}>
      <h2 className="text-base font-bold text-fg">{t('calibration.distribution')}</h2>
      <ul className="flex flex-col gap-1.5">
        {distribution.map((d) => (
          <li key={d.levelName} className="grid grid-cols-[8rem_1fr_2.5rem] items-center gap-2 text-sm">
            <span className="text-fg">{d.levelName}</span>
            <progress aria-label={d.levelName} value={d.count} max={max} className="h-3 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-link [&::-webkit-progress-bar]:bg-neutral-100 [&::-webkit-progress-value]:bg-link" />
            <b className="text-fg" dir="ltr">{d.count}</b>
          </li>
        ))}
      </ul>
    </section>
  );
}
