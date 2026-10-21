import { Between, LessThan, MoreThanOrEqual, type FindOperator } from 'typeorm';

const DAY_MS = 86_400_000;
const startOf = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

/** Inclusive ISO-date range over a timestamp column: from the start of `from` to the end of `until`. */
export function dayRange(from?: string, until?: string): FindOperator<Date> | undefined {
  if (from && until) return Between(startOf(from), new Date(startOf(until).getTime() + DAY_MS - 1));
  if (from) return MoreThanOrEqual(startOf(from));
  if (until) return LessThan(new Date(startOf(until).getTime() + DAY_MS));
  return undefined;
}
