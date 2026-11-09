import { REQUEST_DIRECT_LIMIT, REQUEST_LEVELS, REQUEST_SECTOR_LIMIT, type RequestLevel, type RequestPlanKind } from '@arweqah-platform/shared';

/** Who decides a request of this cost: in the plan and up to 5,000 the direct manager; outside it or up to 20,000 the sector head; above that the CEO. */
export function chainFor(cost: number, plan: RequestPlanKind): RequestLevel {
  if (cost > REQUEST_SECTOR_LIMIT) return 'ceo';
  return plan === 'out' || cost > REQUEST_DIRECT_LIMIT ? 'sector' : 'direct';
}

/** The level above, or null at the top. */
export function levelAbove(level: RequestLevel): RequestLevel | null {
  return REQUEST_LEVELS[REQUEST_LEVELS.indexOf(level) + 1] ?? null;
}

/** The people who hold each post for one employee (null: nobody does). */
export type ApproverUsers = Readonly<Record<RequestLevel, string | null>>;

/** The level and user that decide: the wanted level, or the next one up while nobody holds it or the holder is the employee themselves; null when there is nobody. */
export function resolveApprover(wanted: RequestLevel, users: ApproverUsers, requesterUserId: string): { level: RequestLevel; userId: string } | null {
  for (let level: RequestLevel | null = wanted; level; level = levelAbove(level)) {
    const userId = users[level];
    if (userId && userId !== requesterUserId) return { level, userId };
  }
  return null;
}

/** What is left of the yearly budget, or null when the stage has no cap. */
export const budgetLeft = (cap: number | null, spent: number): number | null => (cap === null ? null : Math.max(0, cap - spent));

/** A cost above what is left of the yearly budget (a warning, never a block). */
export const isOverBudget = (cost: number, cap: number | null, spent: number): boolean => cap !== null && cost > Math.max(0, cap - spent);

const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;

/** The instants a Riyadh calendar year starts and ends (the budget year), for a day written `YYYY-MM-DD`. */
export function budgetYear(riyadhDay: string): { from: Date; to: Date } {
  const year = Number(riyadhDay.slice(0, 4));
  return { from: new Date(Date.UTC(year, 0, 1) - RIYADH_OFFSET_MS), to: new Date(Date.UTC(year + 1, 0, 1) - RIYADH_OFFSET_MS) };
}
