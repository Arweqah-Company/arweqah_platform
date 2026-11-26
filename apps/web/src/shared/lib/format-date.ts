/**
 * The one way the platform writes a date: `2026-12-01`, and with the time `2026-12-01 14:30` (24 hours, Latin digits, Gregorian,
 * Riyadh time), in Arabic and in English, on every screen, in every table and in every file. A day without a time (`2026-12-01`,
 * a needed-by or due date) is shown as it is, never moved by a time zone.
 */
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const PARTS = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

type Moment = string | number | Date | null | undefined;

function partsOf(value: Moment): Record<string, string> | null {
  const date = value instanceof Date ? value : new Date(value ?? NaN);
  if (Number.isNaN(date.getTime())) return null;
  return Object.fromEntries(PARTS.formatToParts(date).map((p) => [p.type, p.value]));
}

/** `2026-12-01` for a day or a moment (the day it falls on in Riyadh); an empty text for nothing. */
export function formatDate(value: Moment): string {
  if (typeof value === 'string' && DAY.test(value)) return value;
  const p = partsOf(value);
  return p ? `${p.year}-${p.month}-${p.day}` : '';
}

/**
 * `2026-12-01 14:30` for a moment (Riyadh time); an empty text for nothing. On a screen the gap between the day and the time is a no-break space: it keeps
 * the whole value one left-to-right run inside Arabic text, so the time never jumps in front of the day. A file (`plain`) gets an ordinary space.
 */
export function formatDateTime(value: Moment, plain = false): string {
  const p = partsOf(value);
  return p ? `${p.year}-${p.month}-${p.day}${plain ? ' ' : '\u00a0'}${p.hour}:${p.minute}` : '';
}
