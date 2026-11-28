/** Typing helpers of the date field: the one written form of a day is `YYYY-MM-DD` with Latin digits. */
/** Arabic-Indic (U+0660…U+0669) and Persian (U+06F0…U+06F9) digits become Latin ones, so a person typing on an Arabic keyboard writes the platform's form. */
export function toLatinDigits(text: string): string {
  return text.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (c) => String((c.charCodeAt(0) - 0x0660) % 0x90));
}

/** Digits only (up to 8) with the dashes added by the field: `2026`, `2026-1`, `2026-12-01`. */
function maskDigits(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean).join('-');
}

/**
 * Whatever the person typed or pasted, shaped as `2026`, `2026-1`, `2026-12-01`. The field adds the dashes itself, but a dash the person types after a whole year
 * or month stays (`1995-`, `1995-03-`: it can be typed as it is written, with `-`, `/` or `.`), and a month or day of one digit that a dash closes gets its zero
 * (`1995-3-` becomes `1995-03-`). Anything else is read as digits only.
 */
export function maskDay(text: string): string {
  const raw = toLatinDigits(text);
  const split = raw.split(/\D/);
  const finished = split.length === 4 && split[3] === ''; // «1995-03-1-»: a dash after the day closes it
  const parts = finished ? split.slice(0, 3) : split;
  if (!isTypedWithDashes(parts)) return maskDigits(raw);
  const [year, month = '', day = ''] = parts;
  const closed = parts.length === 3 && month !== '';
  return `${year}-${closed ? pad2(month) : month}${closed ? `-${finished ? pad2(day) : day}` : ''}`;
}

/** A month or day with its zero in front; an empty one stays empty (a dash typed after nothing is not a «00»). */
const pad2 = (value: string): string => (value === '' ? '' : value.padStart(2, '0'));

/** A whole year, then a dash, then at most a month and a day of two digits each; a day after an empty month, or anything longer, is read as digits only. */
function isTypedWithDashes(parts: string[]): boolean {
  const [year = '', month = '', day = ''] = parts;
  const sized = parts.length >= 2 && parts.length <= 3 && year.length === 4 && month.length <= 2 && day.length <= 2;
  return sized && !(month === '' && day !== '');
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
