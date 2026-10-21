import { InvalidOrgHierarchyError } from '../errors/org.errors';
import type { Names } from '../types/org.types';

export interface PlanLevelInput extends Names {
  id?: string;
  isAssignable: boolean;
}

export interface ExistingLevel {
  id: string;
  sortOrder: number;
  isAssignable: boolean;
}

export interface LevelsPlan {
  removeIds: string[];
  items: (Names & { id?: string; sortOrder: number; isAssignable: boolean })[];
  /** Levels whose units become invalid (removed, or their parent level changed): units and all below are removed. */
  affectedLevelIds: string[];
  /** Levels that stop accepting employees: units stay, their job titles and employees go. */
  unassignedLevelIds: string[];
}

/**
 * Compares a company's current levels with the requested ones. A unit is valid only while the level of
 * its parent is the level right above its own, so any level removed, inserted before it, or reordered
 * invalidates the units of that level. Renames and additions at the end affect nothing.
 */
export function planLevels(existing: ExistingLevel[], input: PlanLevelInput[]): LevelsPlan {
  const ordered = [...existing].sort((a, b) => a.sortOrder - b.sortOrder);
  const byId = new Map(ordered.map((l) => [l.id, l]));
  assertValidInput(byId, input);
  const oldPredecessor = new Map(ordered.map((l, i) => [l.id, ordered[i - 1]?.id ?? null]));
  const keptIds = new Set(input.flatMap((l) => (l.id ? [l.id] : [])));
  const affected = new Set(ordered.filter((l) => !keptIds.has(l.id)).map((l) => l.id));
  const unassigned: string[] = [];
  input.forEach((level, index) => {
    if (!level.id) return;
    const previous = input[index - 1];
    const newPredecessor = index === 0 ? null : (previous?.id ?? `new:${index - 1}`);
    if (newPredecessor !== oldPredecessor.get(level.id)) affected.add(level.id);
    if (byId.get(level.id)?.isAssignable && !level.isAssignable) unassigned.push(level.id);
  });
  return {
    removeIds: ordered.filter((l) => !keptIds.has(l.id)).map((l) => l.id),
    items: input.map((l, index) => ({ id: l.id, nameAr: l.nameAr, nameEn: l.nameEn, isAssignable: l.isAssignable, sortOrder: index + 1 })),
    affectedLevelIds: [...affected],
    unassignedLevelIds: unassigned.filter((id) => !affected.has(id)),
  };
}

function assertValidInput(byId: Map<string, ExistingLevel>, input: PlanLevelInput[]): void {
  const seen = new Set<string>();
  for (const level of input) {
    if (!level.id) continue;
    if (!byId.has(level.id)) throw new InvalidOrgHierarchyError(`Level ${level.id} does not belong to this company`);
    if (seen.has(level.id)) throw new InvalidOrgHierarchyError('A level cannot appear twice');
    seen.add(level.id);
  }
}
