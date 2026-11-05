import type { ManagementMode } from '@arweqah-platform/shared';

export interface ChainTitle {
  id: string;
  /** The title this one reports to, or null at the top. */
  upId: string | null;
  /** Management mode of the unit the title sits in. */
  mode: ManagementMode;
  /** People holding the title, per company. */
  holders: Readonly<Record<string, number>>;
}

export type ChainState = 'vacant' | 'found' | 'blocked';

export interface ChainStep {
  titleId: string;
  state: ChainState;
  /** Holders counted, set when found. */
  count?: number;
}

export interface ChainResult {
  steps: ChainStep[];
  /** The title whose holder manages the employee, or null (no manager: the unit goes into the «no leader» report). */
  managerTitleId: string | null;
}

export interface ChainStart {
  titleId: string;
  /** Company of the employee. */
  company: string;
  /** The group company (Arweqah Alreyadah), whose people lead the shared units. */
  groupCompany: string;
}

interface Walk {
  startPerCompany: boolean;
  start: ChainStart;
}

/** The company whose holders are looked at for a higher title: the employee's own for a title of a per-company unit reached from a per-company unit, the group company's otherwise. */
export function holdersCompany(startPerCompany: boolean, titleMode: ManagementMode, start: Pick<ChainStart, 'company' | 'groupCompany'>): string {
  return startPerCompany && titleMode === 'per_company' ? start.company : start.groupCompany;
}

/** What one higher title means for the employee: out of reach, occupied (with the holders counted), or vacant. */
function judge(title: ChainTitle, walk: Walk): ChainStep {
  const perCompany = title.mode === 'per_company';
  if (walk.startPerCompany && !perCompany && walk.start.company !== walk.start.groupCompany) return { titleId: title.id, state: 'blocked' };
  const company = holdersCompany(walk.startPerCompany, title.mode, walk.start);
  const count = title.holders[company] ?? 0;
  return count > 0 ? { titleId: title.id, state: 'found', count } : { titleId: title.id, state: 'vacant' };
}

/**
 * The nearest higher title that has a holder. An employee of a per-company unit is looked for among the holders of their
 * own company and the search never leaves it (it stops at a shared unit unless the employee belongs to the group company);
 * an employee of a shared unit is looked for among the holders of the group company.
 */
export function resolveManagerChain(titles: ReadonlyMap<string, ChainTitle>, start: ChainStart): ChainResult {
  const first = titles.get(start.titleId);
  const steps: ChainStep[] = [];
  if (!first) return { steps, managerTitleId: null };
  const walk: Walk = { startPerCompany: first.mode === 'per_company', start };
  const seen = new Set([first.id]);
  for (let next = titles.get(first.upId ?? ''); next && !seen.has(next.id); next = titles.get(next.upId ?? '')) {
    seen.add(next.id);
    const step = judge(next, walk);
    steps.push(step);
    if (step.state === 'found') return { steps, managerTitleId: next.id };
    if (step.state === 'blocked') break;
  }
  return { steps, managerTitleId: null };
}
