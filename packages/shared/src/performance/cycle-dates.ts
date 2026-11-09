import { CYCLE_DATE_CHAIN, type CycleDate, type CycleDateKey, type CycleDateProblem } from './cycle';

const endOf = (d: CycleDate): string => d.to ?? d.from;

/**
 * Checks a date set in a cycle against the others: its end is not before its start; and the first five dates follow one another, so a date does not
 * start before the one ahead of it ends nor end after the one behind it starts. A date missing from `dates` is skipped, never guessed (the caller passes the
 * effective set, so every date is there). The two dates outside the chain (the self-evaluation deadline and the close of the qualitative part) only have
 * the first check, and the deadline is not after the close.
 */
export function dateProblems(dates: readonly CycleDate[], next: CycleDate): CycleDateProblem[] {
  const problems: CycleDateProblem[] = [];
  if (next.to !== null && next.to < next.from) problems.push('end_before_start');
  const others = new Map(dates.filter((d) => d.key !== next.key).map((d) => [d.key, d]));
  problems.push(...chainProblems(others, next), ...pairProblems(others, next));
  return problems;
}

/** The first set date behind (or ahead of) a chain date: a chain date not set yet is skipped. */
const nearest = (others: ReadonlyMap<CycleDateKey, CycleDate>, keys: readonly CycleDateKey[]): CycleDate | undefined => keys.map((k) => others.get(k)).find(Boolean);

/** A chain date starts no earlier than the one ahead of it ends, and ends no later than the one behind it starts. */
function chainProblems(others: ReadonlyMap<CycleDateKey, CycleDate>, next: CycleDate): CycleDateProblem[] {
  const at = CYCLE_DATE_CHAIN.indexOf(next.key);
  if (at < 0) return [];
  const before = nearest(others, CYCLE_DATE_CHAIN.slice(0, at).reverse());
  const after = nearest(others, CYCLE_DATE_CHAIN.slice(at + 1));
  const problems: CycleDateProblem[] = [];
  if (before && next.from < endOf(before)) problems.push('before_previous');
  if (after && endOf(next) > after.from) problems.push('after_next');
  return problems;
}

/** The self-evaluation deadline is no later than the close of the qualitative part. */
function pairProblems(others: ReadonlyMap<CycleDateKey, CycleDate>, next: CycleDate): CycleDateProblem[] {
  const close = others.get('qualitative_close');
  const deadline = others.get('self_deadline');
  if (next.key === 'self_deadline' && close && next.from > close.from) return ['after_next'];
  if (next.key === 'qualitative_close' && deadline && next.from < deadline.from) return ['before_previous'];
  return [];
}

/** The dates with this one set (replacing the one with the same key), in the order of the keys. */
export function withDate(dates: readonly CycleDate[], next: CycleDate, order: readonly CycleDateKey[]): CycleDate[] {
  return [...dates.filter((d) => d.key !== next.key), next].sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
}


/** The date a date of each of the two stages outside the chain runs into: the other of the two. */
const PARTNER: Partial<Record<CycleDateKey, CycleDateKey>> = { self_deadline: 'qualitative_close', qualitative_close: 'self_deadline' };

/** The keys of the chain ahead of a date (`behind`: the ones before it, nearest first) or behind it (the ones after it). */
function chainAround(key: CycleDateKey, behind: boolean): CycleDateKey[] {
  const at = CYCLE_DATE_CHAIN.indexOf(key);
  if (at < 0) return [];
  return behind ? CYCLE_DATE_CHAIN.slice(0, at).reverse() : CYCLE_DATE_CHAIN.slice(at + 1);
}

/**
 * The date a refused date runs into, so the message can name it: for `before_previous` the day the stage ahead of it ends, for `after_next` the day the stage behind
 * it starts (the nearest one that is set; the deadline and the close of the qualitative part run into each other). Null for any other problem.
 */
export function conflictDate(dates: readonly CycleDate[], next: CycleDate, problem: CycleDateProblem): string | null {
  if (problem !== 'before_previous' && problem !== 'after_next') return null;
  const others = new Map(dates.filter((d) => d.key !== next.key).map((d) => [d.key, d]));
  const behind = problem === 'before_previous';
  const found = nearest(others, chainAround(next.key, behind));
  if (found) return behind ? endOf(found) : found.from;
  const partner = PARTNER[next.key];
  return (partner && others.get(partner)?.from) || null;
}
