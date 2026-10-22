import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from '../lib/cn';

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called once every box is filled (pasting a full code counts). */
  onComplete?: (value: string) => void;
  label: string;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
}

const DIGITS = /\D/g;

/**
 * One box per digit of an authenticator code. Accepts typing, pasting the whole code and
 * the one-time-code autofill; always left-to-right, even inside Arabic pages.
 */
export function CodeInput({ value, onChange, onComplete, label, length = 6, disabled, invalid, autoFocus }: CodeInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');
  const focus = (index: number) => refs.current[Math.min(Math.max(index, 0), length - 1)]?.focus();

  const commit = (next: string) => {
    onChange(next);
    if (next.length === length) onComplete?.(next);
  };

  const setAt = (index: number, raw: string) => {
    const clean = raw.replace(DIGITS, '');
    if (!clean) return;
    const next = (value.slice(0, index) + clean).slice(0, length);
    commit(next);
    focus(next.length);
  };

  const onKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      onChange(value.slice(0, digits[index] ? index : Math.max(index - 1, 0)));
      focus(digits[index] ? index : index - 1);
    } else if (event.key === 'ArrowLeft') focus(index - 1);
    else if (event.key === 'ArrowRight') focus(index + 1);
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(DIGITS, '').slice(0, length);
    if (pasted) {
      commit(pasted);
      focus(pasted.length);
    }
  };

  return (
    <div role="group" aria-label={label} dir="ltr" className="flex justify-center gap-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          aria-label={`${label} ${index + 1}`}
          aria-invalid={invalid || undefined}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          value={digit}
          onChange={(e) => setAt(index, e.target.value)}
          onKeyDown={(e) => onKeyDown(index, e)}
          onPaste={onPaste}
          onFocus={(e) => e.target.select()}
          className={cn(
            'h-12 w-11 rounded-[var(--radius-control)] border border-neutral-200 bg-white text-center text-xl font-medium text-fg',
            'focus:border-link aria-[invalid=true]:border-danger-700 disabled:opacity-50',
          )}
        />
      ))}
    </div>
  );
}
