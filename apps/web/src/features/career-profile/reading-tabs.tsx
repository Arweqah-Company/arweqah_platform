import { Check, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isOpen, isRead, READ_STEPS, type ReadStep } from './read-steps';

/** The six steps as tabs: read ones carry a check, ones not yet open a lock and cannot be chosen (the click explains why). */
export function ReadingTabs({ step, reached, onChoose }: { step: ReadStep; reached: number; onChoose: (step: ReadStep) => void }) {
  const { t } = useTranslation('career-profile');
  return (
    <div role="tablist" aria-label={t('gate.stepsLabel')} className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-50 p-1">
      {READ_STEPS.map((id, i) => {
        const open = isOpen(id, reached);
        return (
          <button
            key={id}
            type="button"
            role="tab"
            id={`read-tab-${id}`}
            aria-selected={step === id}
            aria-disabled={!open}
            title={open ? undefined : t('gate.locked')}
            onClick={() => onChoose(id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-button)] px-3 py-2 text-sm font-medium ${step === id ? 'bg-primary text-on-primary' : 'text-muted'} ${open ? '' : 'cursor-not-allowed opacity-60'}`}
          >
            {i + 1}. {t(id === 'ack' ? 'gate.ackStep' : `sections.${id}`)}
            {isRead(id, reached) && <Check className="size-4" aria-hidden />}
            {!open && <Lock className="size-4" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
