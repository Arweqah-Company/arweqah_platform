import type { LeaderKind, LeaderStatus } from '@arweqah-platform/shared';
import { dayBefore } from '../../../../common/domain/dates';
import {
  OrgActingIsLeaderError,
  OrgActingNeedsLeaderError,
  OrgActingOverlapError,
  OrgActingWindowError,
  OrgLeaderCompanyError,
  OrgLeaderDateNotAfterError,
  OrgLeaderInThePastError,
} from '../errors/org.errors';
import type { LeaderPlan, LeaderRow } from '../types/org-leader.types';

export function leaderStatus(row: Pick<LeaderRow, 'validFrom' | 'validTo'>, today: string): LeaderStatus {
  if (row.validFrom > today) return 'scheduled';
  return row.validTo !== null && row.validTo < today ? 'past' : 'current';
}

export const isActiveLeader = (row: Pick<LeaderRow, 'validFrom' | 'validTo'>, today: string): boolean => leaderStatus(row, today) === 'current';

/** A shared unit is led from the group company; a unit managed per company is led for any company (by one of its own people, checked against the employee). */
export function assertLeaderCompany(mode: 'shared' | 'per_company', companyId: string, groupCompanyId: string): void {
  if (mode === 'shared' && companyId !== groupCompanyId) throw new OrgLeaderCompanyError();
}

export interface LeaderRequest {
  kind: LeaderKind;
  employeeId: string;
  validFrom: string;
  validTo: string | null;
}

const covers = (row: Pick<LeaderRow, 'validFrom' | 'validTo'>, day: string): boolean => row.validFrom <= day && (row.validTo === null || row.validTo >= day);

/**
 * An acting leader stands in for a leader: it has a window (both ends), starts today or later, is not the leader itself, another acting leader does not
 * hold the same days, and a leader (a different person) is in force from the first day of the window to its last. `rows` are the unit's rows of the company.
 */
export function assertActing(rows: readonly LeaderRow[], request: LeaderRequest, today: string): void {
  if (request.validTo === null) throw new OrgActingWindowError();
  const last = request.validTo;
  if (request.validFrom < today) throw new OrgLeaderInThePastError();
  const covering = rows.filter((l) => l.kind === 'leader' && l.validFrom <= request.validFrom && (l.validTo === null || l.validTo >= last));
  if (!covering.length) throw new OrgActingNeedsLeaderError();
  if (covering.some((l) => l.employeeId === request.employeeId)) throw new OrgActingIsLeaderError();
  if (rows.some((l) => l.kind === 'acting' && l.validFrom <= last && (l.validTo === null || l.validTo >= request.validFrom))) throw new OrgActingOverlapError();
}

/**
 * What a new leader starting `validFrom` does to the leader rows of one unit and company (acting rows are left alone): it starts today or
 * later, strictly after the last leader (on the day the last one starts it replaces that one), and closes the leader still in force the day before.
 */
export function planLeader(rows: readonly LeaderRow[], request: Pick<LeaderRequest, 'validFrom'>, today: string): LeaderPlan {
  if (request.validFrom < today) throw new OrgLeaderInThePastError();
  const leaders = rows.filter((r) => r.kind === 'leader').sort((a, b) => a.validFrom.localeCompare(b.validFrom));
  const last = leaders.at(-1);
  if (last && request.validFrom < last.validFrom) throw new OrgLeaderDateNotAfterError(last.validFrom);
  if (last && request.validFrom === last.validFrom) return { close: [], replaceIds: [last.id] };
  const inForce = leaders.filter((l) => covers(l, request.validFrom) && l.validFrom < request.validFrom);
  return { close: inForce.map((l) => ({ id: l.id, validTo: dayBefore(request.validFrom) })), replaceIds: [] };
}

/** One unit above (or the unit itself) with the leaders it has, nearest first when walked up from the unit. */
export interface LeaderChainUnit {
  nodeId: string;
  parentId: string | null;
  /** Companies that have an active leader in the unit, with the person. */
  leaders: ReadonlyMap<string, string>;
  /** Whether the unit is shared (led from the group company). */
  shared: boolean;
}

export interface Escalation {
  nodeId: string;
  employeeId: string;
}

/**
 * Where an employee's manager goes when nobody leads their unit for their company: the nearest unit above that has a leader for the company.
 * From a unit managed per company the search never leaves the company: it stops at a shared unit unless the employee belongs to the group
 * company. From a shared unit the leaders sought are the group company's. Null when no unit above has one (the manager stays empty).
 */
export function escalateLeader(units: ReadonlyMap<string, LeaderChainUnit>, from: string, company: string, groupCompany: string): Escalation | null {
  const start = units.get(from);
  const startShared = start?.shared ?? false;
  const who: Walker = { company, groupCompany, startShared, lookup: startShared ? groupCompany : company };
  const seen = new Set<string>([from]);
  for (let cursor = start?.parentId; cursor && !seen.has(cursor); cursor = units.get(cursor)?.parentId) {
    seen.add(cursor);
    const found = visit(units.get(cursor), cursor, who);
    if (found !== undefined) return found;
  }
  return null;
}

interface Walker {
  company: string;
  groupCompany: string;
  startShared: boolean;
  /** The company whose leaders are sought. */
  lookup: string;
}

/** One unit on the way up: undefined = keep climbing, null = out of reach (stop), else the leader found. */
function visit(unit: LeaderChainUnit | undefined, nodeId: string, who: Walker): Escalation | null | undefined {
  if (!unit || isOutOfReach(unit, who)) return null;
  const employeeId = unit.leaders.get(who.lookup);
  return employeeId ? { nodeId, employeeId } : undefined;
}

/** From a unit managed per company, a shared unit is out of reach for an employee who is not of the group company. */
const isOutOfReach = (unit: LeaderChainUnit, who: Walker): boolean => !who.startShared && unit.shared && who.company !== who.groupCompany;
