import { cn } from '../lib/cn';

export interface SegmentChoice<T extends string> {
  id: T;
  label: string;
}

/** A short switch between two or three states of one list, with words (the view switch uses icons): the chosen one is `aria-pressed`. */
export function SegmentedControl<T extends string>({ value, onChange, choices, label, tour }: { value: T; onChange: (id: T) => void; choices: SegmentChoice<T>[]; label: string; tour?: string }) {
  return (
    <div role="group" aria-label={label} data-tour={tour} className="flex rounded-xl border border-neutral-200 bg-neutral-50 p-1">
      {choices.map(({ id, label: text }) => (
        <button key={id} type="button" aria-pressed={value === id} onClick={() => onChange(id)} className={cn('min-h-9 rounded-lg px-3 text-sm font-medium transition-colors duration-150', value === id ? 'bg-white text-link shadow-sm' : 'text-muted hover:text-fg')}>
          {text}
        </button>
      ))}
    </div>
  );
}
