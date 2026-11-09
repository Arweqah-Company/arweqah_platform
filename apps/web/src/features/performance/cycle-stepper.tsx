import { CYCLE_STAGES, type CycleStage } from '@arweqah-platform/shared';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';

/** Where a stage stands for the stage the cycle is in (`none` before any cycle is open: every stage is coming). */
export function stepState(step: CycleStage, stage: CycleStage | 'none'): 'done' | 'current' | 'next' {
  const at = stage === 'none' ? -1 : CYCLE_STAGES.indexOf(stage);
  const me = CYCLE_STAGES.indexOf(step);
  return me < at ? 'done' : me === at ? 'current' : 'next';
}

/** The seven stages as pills one after another; the stage the cycle is in is filled, and every stage opens what happens in it. */
export function CycleStepper({ stage, onOpen }: { stage: CycleStage | 'none'; onOpen: (step: CycleStage) => void }) {
  const { t } = useTranslation('performance');
  return (
    <ol className="flex flex-wrap items-center gap-1.5" aria-label={t('stepper.label')} data-tour="performance-stepper">
      {CYCLE_STAGES.map((step, i) => {
        const current = stepState(step, stage) === 'current';
        return (
          <li key={step} className="flex items-center gap-1.5">
            <button type="button" aria-current={current ? 'step' : undefined} onClick={() => onOpen(step)} className={cn('inline-flex min-h-10 items-center rounded-full border px-3.5 text-sm', current ? 'border-link bg-link text-on-primary' : 'border-neutral-200 bg-neutral-50 text-fg hover:border-link')}>
              {t(`stages.${step}.title`)}
            </button>
            {i < CYCLE_STAGES.length - 1 && <ChevronRight className="size-4 text-muted rtl:rotate-180" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
