import { ROOT_PARENT, UNIT_TYPE } from '@arweqah-platform/shared';
import { InvalidOrgLevelsError, InvalidOrgRulesError } from '../errors/org.errors';
import { fixedRuleViolations, type ParentRules } from './org-unit-types.rules';
import type { Names } from '../types/org.types';

export interface PlanLevelInput extends Names {
  id?: string;
  acceptsTitles: boolean;
}

export interface ExistingLevel {
  id: string;
  key: string;
  isBuiltIn: boolean;
  sortOrder: number;
}

export interface PlannedLevel extends Names {
  /** Present for a type that already exists. */
  id?: string;
  acceptsTitles: boolean;
  sortOrder: number;
}

export interface LevelsPlan {
  /** Added types that are left out of the request. */
  removeIds: string[];
  items: PlannedLevel[];
}

function assertOneLevel(existing: Map<string, ExistingLevel>, level: PlanLevelInput): void {
  const known = level.id ? existing.get(level.id) : undefined;
  if (level.id && !known) throw new InvalidOrgLevelsError(`Type ${level.id} does not exist`);
  if (known?.key === UNIT_TYPE.Sector && level.acceptsTitles) throw new InvalidOrgLevelsError('A sector never takes job titles or employees');
}

function assertValidInput(existing: Map<string, ExistingLevel>, input: PlanLevelInput[]): void {
  const ids = input.flatMap((l) => (l.id ? [l.id] : []));
  if (new Set(ids).size !== ids.length) throw new InvalidOrgLevelsError('A type cannot appear twice');
  const names = input.map((l) => l.nameAr.trim());
  const repeated = names.find((name, i) => names.indexOf(name) !== i);
  if (repeated) throw new InvalidOrgLevelsError(`The Arabic name "${repeated}" is used by two types`);
  input.forEach((level) => assertOneLevel(existing, level));
}

/**
 * Compares the stored unit types with the requested ones. A built-in type can be renamed but never removed (and a sector never
 * accepts titles); a type that is left out is removed only if it was added by an administrator. Whether units still use a removed
 * type is checked by the caller.
 */
export function planLevels(existing: ExistingLevel[], input: PlanLevelInput[]): LevelsPlan {
  const byId = new Map(existing.map((l) => [l.id, l]));
  assertValidInput(byId, input);
  const kept = new Set(input.flatMap((l) => (l.id ? [l.id] : [])));
  const removed = existing.filter((l) => !kept.has(l.id));
  const builtIn = removed.find((l) => l.isBuiltIn);
  if (builtIn) throw new InvalidOrgLevelsError(`The built-in type "${builtIn.key}" cannot be removed`);
  let next = Math.max(0, ...existing.map((l) => l.sortOrder));
  const items = input.map((l) => ({ id: l.id, nameAr: l.nameAr, nameEn: l.nameEn, acceptsTitles: l.acceptsTitles, sortOrder: l.id ? (byId.get(l.id)?.sortOrder as number) : ++next }));
  return { removeIds: removed.map((l) => l.id), items };
}

/** The rules table may mention only the group (`root`) and existing types, and must keep the two fixed rules. */
export function assertValidRules(rules: ParentRules, keys: ReadonlySet<string>): void {
  const known = (key: string): boolean => key === ROOT_PARENT || keys.has(key);
  for (const [parent, children] of Object.entries(rules)) {
    if (!known(parent)) throw new InvalidOrgRulesError(`Unknown parent type "${parent}"`);
    const unknown = children.find((child) => child === ROOT_PARENT || !keys.has(child));
    if (unknown) throw new InvalidOrgRulesError(`Unknown child type "${unknown}"`);
  }
  const violations = fixedRuleViolations(rules);
  if (violations.length) throw new InvalidOrgRulesError(`These pairs are never allowed: ${violations.join(', ')}`);
}
