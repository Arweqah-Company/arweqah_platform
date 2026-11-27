import { CalendarDays } from 'lucide-react';
import { useRef, useState, type ChangeEvent, type FocusEvent, type InputHTMLAttributes, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/cn';
import { dayProblem, isRealDay, maskDay } from '../lib/date-mask';
import { Input } from './form-field';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'dir' | 'inputMode' | 'maxLength'> & { ref?: Ref<HTMLInputElement> };

/** Writes `value` into an input the way a person's typing would, so React (and `react-hook-form`) hear an ordinary change. */
function typeInto(input: HTMLInputElement, value: string): void {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * The one date field of the platform: text `YYYY-MM-DD` in Latin digits, left-to-right, aligned to the start of the page (the right in Arabic),
 * with a calendar button. The browser's own `type="date"` writes its empty text and its digits in the device's language («ةنس/رهش/موي»,
 * «٢٤/١١/١٩٩٦»), so it is not used anywhere (FR-201). The value is always `YYYY-MM-DD` or an empty text.
 */
export function DateInput({ ref, onChange, onBlur, min, max, className, 'aria-invalid': invalid, ...props }: Props) {
  const { t } = useTranslation();
  const own = useRef<HTMLInputElement | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [touched, setTouched] = useState(false);
  const [wrong, setWrong] = useState(false);
  const bound = (v: unknown) => (typeof v === 'string' ? v : undefined);
  const check = () => setWrong(dayProblem(own.current?.value ?? '', bound(min), bound(max)) !== null);
  const setRef = (node: HTMLInputElement | null) => {
    own.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };
  const change = (e: ChangeEvent<HTMLInputElement>) => {
    const masked = maskDay(e.target.value);
    if (masked !== e.target.value) e.target.value = masked;
    if (touched) check();
    onChange?.(e);
  };
  const blur = (e: FocusEvent<HTMLInputElement>) => {
    setTouched(true);
    check();
    onBlur?.(e);
  };
  const openCalendar = () => {
    const current = own.current?.value ?? '';
    if (picker.current) picker.current.value = isRealDay(current) ? current : '';
    picker.current?.showPicker?.();
  };
  return (
    <span className="relative block w-full">
      <Input {...props} ref={setRef} type="text" dir="ltr" inputMode="numeric" autoComplete="off" maxLength={10} placeholder="YYYY-MM-DD" aria-invalid={invalid || wrong}
        className={cn('text-start ps-4 pe-11 rtl:text-end rtl:ps-11 rtl:pe-4', className)} onChange={change} onBlur={blur} />
      <button type="button" tabIndex={-1} disabled={props.disabled || props.readOnly} aria-label={t('dateInput.open')} onClick={openCalendar}
        className="absolute end-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:text-fg disabled:opacity-40">
        <CalendarDays aria-hidden className="size-4" />
      </button>
      <input ref={picker} type="date" tabIndex={-1} aria-hidden min={bound(min)} max={bound(max)}
        className="pointer-events-none absolute end-2 top-full size-0 opacity-0" onChange={(e) => own.current && typeInto(own.current, e.target.value)} />
    </span>
  );
}
