import { CYCLE_STAGES, type CycleStage } from '@arweqah-platform/shared';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** The stages in order, with the one before any cycle as the first: none, then the seven of the cycle. */
export const STEPS = ['none', ...CYCLE_STAGES] as const;
export type Step = (typeof STEPS)[number];

/** Where a step stands for the stage the cycle is in: done, current or coming. */
export function stepState(step: Step, stage: Step): 'done' | 'current' | 'next' {
  const at = STEPS.indexOf(stage);
  const me = STEPS.indexOf(step);
  return me < at ? 'done' : me === at ? 'current' : 'next';
}

const STATE_CLASS = {
  done: 'border-green-800 bg-green-50 text-fg',
  current: 'border-link bg-petrol-50 font-bold text-fg ring-2 ring-link',
  next: 'border-neutral-300 bg-white text-muted',
} as const;

/** The stepper of the cycle: every stage is a button that opens what happens in it. */
export function CycleStepper({ stage, onOpen }: { stage: CycleStage | 'none'; onOpen: (step: Step) => void }) {
  const { t } = useTranslation('performance');
  return (
    <ol className="flex flex-wrap gap-2" aria-label={t('stepper.label')} data-tour="performance-stepper">
      {STEPS.map((step, i) => {
        const state = stepState(step, stage);
        return (
          <li key={step}>
            <button type="button" aria-current={state === 'current' ? 'step' : undefined} onClick={() => onOpen(step)} className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm ${STATE_CLASS[state]}`}>
              <span className="grid size-6 place-items-center rounded-full bg-petrol-800 text-xs font-bold text-cream" aria-hidden>{state === 'done' ? <Check className="size-3.5" /> : i + 1}</span>
              {t(`stages.${step}.title`)}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
