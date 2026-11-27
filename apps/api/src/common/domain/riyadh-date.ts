const RIYADH_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' });

/** Today's date in Riyadh as YYYY-MM-DD (the platform's day, whatever the server's clock zone). */
export const todayInRiyadh = (now: Date = new Date()): string => RIYADH_DATE.format(now);

const RIYADH_MOMENT = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** A moment the way the platform writes it everywhere, `2026-12-01 14:30` (Riyadh time, 24 hours, Latin digits); the web writes it the same way. */
export function formatRiyadhMoment(moment: Date): string {
  const p = Object.fromEntries(RIYADH_MOMENT.formatToParts(moment).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}
