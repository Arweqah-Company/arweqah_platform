/** The day before an ISO date (calendar arithmetic in UTC, so no daylight-saving drift). */
export function dayBefore(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
