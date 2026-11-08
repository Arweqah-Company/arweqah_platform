const DAY = 86_400_000;

/** Whole days from `today` to a `YYYY-MM-DD` day (negative when it has passed); both are read as calendar days, so the time of day never matters. */
export function daysUntil(day: string, today: Date): number {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / DAY);
}
