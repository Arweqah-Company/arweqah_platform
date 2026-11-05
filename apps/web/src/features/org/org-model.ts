import { childTypesOf, type JobTitleDto, type OrgLevelDto, type OrgTreeDto, type OrgTreeNodeDto } from '@arweqah-platform/shared';
import type { ChartTone } from '@/shared/ui';
import type { FilterValues } from '@/shared/lib/use-filters';
import { matchesText } from '@/shared/lib/text-match';

export type OrgNode = OrgTreeNodeDto;

/** The colour of each type of unit (not of its depth); an added type is neutral. */
const TONE_OF_TYPE: Record<string, ChartTone> = { sector: 'petrol', department: 'green', section: 'orange', unit: 'neutral', office: 'beige' };
export const toneOfLevel = (level: OrgLevelDto | undefined): ChartTone => TONE_OF_TYPE[level?.tone ?? 'unit'] ?? 'neutral';

export const nodeName = (node: { nameAr: string; nameEn: string }, ar: boolean): string => (ar ? node.nameAr : node.nameEn) || node.nameAr;
export const titleName = (title: JobTitleDto, ar: boolean): string => (ar ? title.nameAr : title.nameEn) || title.nameAr;

const STATUS_TESTS: Record<string, (n: OrgNode) => boolean> = {
  empty: (n) => n.subtreeStaffCount === 0,
  noleader: (n) => n.hasNoLeader,
  inactive: (n) => !n.isActive,
  active: (n) => n.isActive,
};

const today = (): string => new Date().toISOString().slice(0, 10);
/** A unit that starts later, or that has a dated change waiting for its day. */
export const isScheduled = (node: OrgNode): boolean => node.startDate > today() || node.hasScheduledChange;

/** The words a search looks in: the unit's names and code and the names of its job titles. */
function searchFields(node: OrgNode): string[] {
  return [node.nameAr, node.nameEn, node.code ?? '', ...node.titles.flatMap((t) => [t.nameAr, t.nameEn])];
}

const hasWith = (value: boolean, wanted: string): boolean => value === (wanted === 'with');

/** The attribute filters of the toolbar (type, management mode, status, employees, leader). */
function matchesFilters(node: OrgNode, v: FilterValues): boolean {
  if (v.level && node.levelId !== v.level) return false;
  if (v.mode && node.effectiveMode !== v.mode) return false;
  if (v.status && !STATUS_TESTS[v.status]?.(node)) return false;
  return !(v.employees && !hasWith(node.staffCount > 0, v.employees));
}

/** Whether a unit matches the search and every filter of the toolbar. */
export function unitMatches(node: OrgNode, term: string, v: FilterValues): boolean {
  if (!matchesText(searchFields(node), term) || !matchesFilters(node, v)) return false;
  return !v.manager || hasWith(!!node.managerName, v.manager);
}

export interface UnitRowData {
  node: OrgNode;
  depth: number;
}

/** Units in tree order (each parent before its children), with how deep each sits. A unit whose parent is not in the list counts as a top one. */
export function inTreeOrder(nodes: OrgNode[]): UnitRowData[] {
  const ids = new Set(nodes.map((n) => n.id));
  const kids = new Map<string | null, OrgNode[]>();
  for (const n of nodes) {
    const key = n.parentId && ids.has(n.parentId) ? n.parentId : null;
    kids.set(key, [...(kids.get(key) ?? []), n]);
  }
  const walk = (parent: string | null, depth: number): UnitRowData[] => (kids.get(parent) ?? []).flatMap((node) => [{ node, depth }, ...walk(node.id, depth + 1)]);
  return walk(null, 0);
}

/** The units from the top one down to this one. */
export function pathOf(byId: Map<string, OrgNode>, node: OrgNode): OrgNode[] {
  const path: OrgNode[] = [];
  for (let n: OrgNode | undefined = node; n; n = n.parentId ? byId.get(n.parentId) : undefined) path.unshift(n);
  return path;
}

/** Employees of one company in each unit and everything under it (from the per-company counts of the full view). */
export function subtreeOfCompany(nodes: OrgNode[], companyId: string): Map<string, number> {
  const parent = new Map(nodes.map((n) => [n.id, n.parentId]));
  const total = new Map<string, number>();
  for (const n of nodes) for (let p: string | null = n.id; p; p = parent.get(p) ?? null) total.set(p, (total.get(p) ?? 0) + (n.staffByCompany?.[companyId] ?? 0));
  return total;
}

/** Employees per company in a unit and everything under it, or null in the team view (no per-company counts). */
export function distribution(nodes: OrgNode[], id: string): Record<string, number> | null {
  const inside = new Set<string>([id]);
  for (const { node } of inTreeOrder(nodes)) if (node.parentId && inside.has(node.parentId)) inside.add(node.id);
  const out: Record<string, number> = {};
  for (const n of nodes) {
    if (!inside.has(n.id)) continue;
    if (!n.staffByCompany) return null;
    for (const [company, count] of Object.entries(n.staffByCompany)) out[company] = (out[company] ?? 0) + count;
  }
  return out;
}

export interface OrgModel {
  nodes: OrgNode[];
  byId: Map<string, OrgNode>;
  levelById: Map<string, OrgLevelDto>;
  /** Units that match the search and filters. */
  matching: Set<string>;
  /** Matching units and the units above them (the way to a match). */
  kept: Set<string>;
  filtering: boolean;
  /** Employees in each unit and everything under it, as the page counts them (of the compared company when one is chosen). */
  counts: Map<string, number>;
  total: number;
  /** Units in tree order, narrowed to `kept`. */
  rows: UnitRowData[];
}

/** Everything the four views and the details share: the index of the tree, what matches, and the counts shown. */
export function buildModel(tree: OrgTreeDto, term: string, values: FilterValues, compare: string | undefined): OrgModel {
  const byId = new Map(tree.nodes.map((n) => [n.id, n]));
  const filtering = term.trim() !== '' || Object.keys(values).length > 0;
  const matching = new Set(tree.nodes.filter((n) => !filtering || unitMatches(n, term, values)).map((n) => n.id));
  const kept = new Set(matching);
  if (filtering) for (const id of matching) for (let p = byId.get(id)?.parentId; p && !kept.has(p); p = byId.get(p)?.parentId) kept.add(p);
  const perCompany = compare ? subtreeOfCompany(tree.nodes, compare) : null;
  const counts = new Map(tree.nodes.map((n) => [n.id, perCompany ? (perCompany.get(n.id) ?? 0) : n.subtreeStaffCount]));
  const total = tree.nodes.filter((n) => !n.parentId || !byId.has(n.parentId)).reduce((sum, n) => sum + (counts.get(n.id) ?? 0), 0);
  return { nodes: tree.nodes, byId, levelById: new Map(tree.levels.map((l) => [l.id, l])), matching, kept, filtering, counts, total, rows: inTreeOrder(tree.nodes).filter(({ node }) => kept.has(node.id)) };
}

/** Whether a unit of this type can have children at all (the rules table allows at least one type under it). */
export const canHaveChildren = (tree: OrgTreeDto, levelKey: string): boolean => childTypesOf(tree.rules, levelKey).some((key) => tree.levels.some((l) => l.key === key));
