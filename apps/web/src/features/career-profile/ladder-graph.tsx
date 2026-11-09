import { orderedLadder, type CareerContent } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui';

/** Heights of the steps, one class each (rising from the first step; the design system allows no inline style). */
const HEIGHTS = ['sm:h-36', 'sm:h-40', 'sm:h-44', 'sm:h-48', 'sm:h-52', 'sm:h-56', 'sm:h-60', 'sm:h-64', 'sm:h-72'] as const;

type Step = CareerContent['ladder'][number];

/** One step of the ladder: its number, level and title; «you are here» above the current one, «next level» above the one after it. */
function LadderStep({ step, index, current, onPreview }: { step: Step; index: number; current: number; onPreview: boolean }) {
  const { t } = useTranslation('career-profile');
  const state = step.current ? 'here' : index === current + 1 ? 'next' : index < current ? 'past' : 'far';
  const tone = { here: 'border-2 border-link bg-petrol-50', next: 'border-2 border-dashed border-link bg-white', past: 'border border-neutral-200 bg-neutral-50 opacity-80', far: 'border border-neutral-200 bg-neutral-50' }[state];
  return (
    <li className="flex flex-1 flex-col justify-end gap-1.5">
      {state === 'here' && <span className="mx-auto"><Badge tone="info">{onPreview ? t('development.currentTitle') : t('development.youAreHere')}</Badge></span>}
      {state === 'next' && <span className="mx-auto text-sm text-muted">{t('development.nextLevel')}</span>}
      <div className={`flex flex-col items-start gap-1.5 rounded-t-2xl rounded-b-md p-3 ${tone} ${HEIGHTS[Math.min(index, HEIGHTS.length - 1)]}`}>
        <span className="grid size-7 place-items-center rounded-full bg-petrol-800 text-sm font-bold text-cream">{index + 1}</span>
        <span className="font-latin text-sm font-bold text-muted" dir="ltr">{step.level}</span>
        <b className="text-fg">{step.title}</b>
      </div>
    </li>
  );
}

/** The ladder as rising steps from the entry level (right, in Arabic) to the highest (left), in the order it is climbed whatever order the file listed it in; on a phone the steps stack with the highest on top. */
export function LadderGraph({ ladder: listed, preview = false }: { ladder: CareerContent['ladder']; preview?: boolean }) {
  const { t } = useTranslation('career-profile');
  const ladder = orderedLadder(listed);
  const current = ladder.findIndex((s) => s.current);
  return (
    <>
      <ol className="flex items-end gap-2 max-sm:flex-col-reverse max-sm:items-stretch" aria-label={t('development.ladder')}>
        {ladder.map((step, i) => <LadderStep key={step.level} step={step} index={i} current={current} onPreview={preview} />)}
      </ol>
      <p className="mt-2 text-sm text-muted">{t('development.ladderHint')}</p>
    </>
  );
}
