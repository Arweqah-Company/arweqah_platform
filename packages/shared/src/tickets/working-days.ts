/** Friday and Saturday (as `Date#getUTCDay` numbers) are the weekend: they do not count as working days. */
export const WEEKEND_DAYS: readonly number[] = [5, 6];

const isWeekend = (d: Date): boolean => WEEKEND_DAYS.includes(d.getUTCDay());

/** `isoDate` plus `days` working days (0 = the same day). Official holidays are not known to the system, so they count as working days. */
export function addWorkingDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  let left = days;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (!isWeekend(d)) left -= 1;
  }
  return d.toISOString().slice(0, 10);
}

/** Calendar days between two ISO dates (`to` − `from`). */
export function daysBetween(from: string, to: string): number {
  return Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000);
}

/** "Today" for the people of the company: the date in Riyadh (UTC+3, no daylight saving), whatever the server's clock zone. */
export const riyadhToday = (now: Date = new Date()): string => new Date(now.getTime() + 3 * 3_600_000).toISOString().slice(0, 10);
