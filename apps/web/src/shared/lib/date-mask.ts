/** Typing helpers of the date field: the one written form of a day is `YYYY-MM-DD` with Latin digits. */
/** Arabic-Indic (U+0660…U+0669) and Persian (U+06F0…U+06F9) digits become Latin ones, so a person typing on an Arabic keyboard writes the platform's form. */
export function toLatinDigits(text: string): string {
  return text.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (c) => String((c.charCodeAt(0) - 0x0660) % 0x90));
}

/** Whatever the person typed or pasted, shaped as `2026`, `2026-1`, `2026-12-01`: digits only (up to 8), dashes added by the field. */
export function maskDay(text: string): string {
  const digits = toLatinDigits(text).replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean).join('-');
}

/** A complete day that exists on the calendar (`2026-02-30` is not one). */
export function isRealDay(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [y, m, d] = text.split('-').map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m! - 1 && date.getUTCDate() === d;
}

/** The problem with a non-empty value, or `null`: not a real day, or outside `min` / `max` (compared as text, which orders `YYYY-MM-DD` correctly). */
export function dayProblem(text: string, min?: string, max?: string): 'format' | 'range' | null {
  if (!text) return null;
  if (!isRealDay(text)) return 'format';
  return (min && text < min) || (max && text > max) ? 'range' : null;
}
