import { CYCLE_DATE_KEYS, type CycleDate, type CycleDateKey } from '@arweqah-platform/shared';

/**
 * The usual dates of the fiscal year `year` (April `year` to March `year + 1`): the self-evaluation closes on 10 March and the qualitative part on 25 March of the
 * year after, then the final numbers 15 to 20 April, the calibration meetings 21 to 24, the approval on 27, the individual notification on 30 April and the objection
 * window 3 to 7 May; the milestones on the 15th: July and September of `year`, January and March of the year after. Assumed from the concept's example (plan §3.7b and §3.6c); HR changes any of them.
 */
export function defaultCycleDates(year: number): CycleDate[] {
  const next = year + 1;
  const on = (key: CycleDateKey, from: string, to: string | null, y = next): CycleDate => ({ key, from: `${y}-${from}`, to: to ? `${y}-${to}` : null });
  const usual = [
    on('final', '04-15', '04-20'),
    on('calibration', '04-21', '04-24'),
    on('approval', '04-27', null),
    on('notification', '04-30', null),
    on('objection', '05-03', '05-07'),
    on('self_deadline', '03-10', null),
    on('qualitative_close', '03-25', null),
    on('review_jan', '01-15', null),
    on('pulse_mar', '03-15', null),
    on('review_jul', '07-15', null, year),
    on('pulse_sep', '09-15', null, year),
  ];
  return usual.sort((a, b) => CYCLE_DATE_KEYS.indexOf(a.key) - CYCLE_DATE_KEYS.indexOf(b.key));
}

/** The dates of a cycle (every key): what was set for each key, else its usual date, in the order of the keys. */
export function effectiveDates(stored: readonly CycleDate[], year: number): CycleDate[] {
  const set = new Map(stored.map((d) => [d.key, d]));
  return defaultCycleDates(year).map((usual) => set.get(usual.key) ?? usual);
}

/** The fiscal year the next cycle belongs to, from today's date (YYYY-MM-DD, Riyadh): the year whose April is the latest one that began. */
export function nextFiscalYear(today: string): number {
  const year = Number(today.slice(0, 4));
  return Number(today.slice(5, 7)) >= 4 ? year : year - 1;
}
