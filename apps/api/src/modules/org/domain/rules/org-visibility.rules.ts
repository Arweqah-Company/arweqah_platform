import type { ManagementMode } from '@arweqah-platform/shared';

export interface VisibilityNode {
  id: string;
  parentId: string | null;
  /** Explicit management mode, or null to inherit from the closest ancestor that has one. */
  mode: ManagementMode | null;
}

/** Direct employees of each unit, per company: `unitId → companyId → count`. */
export type StaffByUnit = ReadonlyMap<string, ReadonlyMap<string, number>>;

/** A unit with no explicit mode anywhere above it is managed per company (the safe default). */
const DEFAULT_MODE: ManagementMode = 'per_company';

export function effectiveModes(nodes: readonly VisibilityNode[]): Map<string, ManagementMode> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out = new Map<string, ManagementMode>();
  const resolve = (id: string): ManagementMode => {
    const known = out.get(id);
    if (known) return known;
    const node = byId.get(id);
    const parent = node?.parentId ?? null;
    const mode = node?.mode ?? (parent && byId.has(parent) ? resolve(parent) : DEFAULT_MODE);
    out.set(id, mode);
    return mode;
  };
  nodes.forEach((n) => resolve(n.id));
  return out;
}

function childrenOf(nodes: readonly VisibilityNode[]): Map<string | null, string[]> {
  const map = new Map<string | null, string[]>();
  for (const n of nodes) map.set(n.parentId, [...(map.get(n.parentId) ?? []), n.id]);
  return map;
}

/**
 * The units a viewer of `company` sees without the «see the whole structure» key: a per-company unit when employees of
 * that company are in it or under it, a shared unit when anyone is in it or under it, and every unit above a visible one.
 */
export function visibleUnitIds(nodes: readonly VisibilityNode[], staff: StaffByUnit, company: string): Set<string> {
  const modes = effectiveModes(nodes);
  const kids = childrenOf(nodes);
  const visible = new Set<string>();
  const counts = (id: string): { mine: number; all: number } => {
    const own = staff.get(id);
    return { mine: own?.get(company) ?? 0, all: own ? [...own.values()].reduce((a, b) => a + b, 0) : 0 };
  };
  const walk = (id: string): { mine: number; all: number } => {
    const total = counts(id);
    for (const child of kids.get(id) ?? []) {
      const sub = walk(child);
      total.mine += sub.mine;
      total.all += sub.all;
    }
    const shown = modes.get(id) === 'shared' ? total.all > 0 : total.mine > 0;
    if (shown || (kids.get(id) ?? []).some((c) => visible.has(c))) visible.add(id);
    return total;
  };
  (kids.get(null) ?? []).forEach(walk);
  return visible;
}
