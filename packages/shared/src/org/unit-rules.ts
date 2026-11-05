import { ROOT_PARENT, UNIT_TYPE } from './unit-types';

/** The stored «who may be created under whom» table: parent type (or `root`) → child types. */
export type ParentRules = Readonly<Record<string, readonly string[]>>;

/** Two rules stay in code whatever the table says: a sector sits only under the root, and an office never sits under an office. */
function violatesFixedRule(parent: string, child: string): boolean {
  if (child === UNIT_TYPE.Sector) return parent !== ROOT_PARENT;
  return parent === UNIT_TYPE.Office && child === UNIT_TYPE.Office;
}

export function canCreateUnder(rules: ParentRules, parent: string, child: string): boolean {
  if (violatesFixedRule(parent, child)) return false;
  return (rules[parent] ?? []).includes(child);
}

export function childTypesOf(rules: ParentRules, parent: string): string[] {
  return (rules[parent] ?? []).filter((child) => canCreateUnder(rules, parent, child));
}

/** Pairs of the table that break a fixed rule, so saving the table can refuse them (e.g. `office>office`). */
export function fixedRuleViolations(rules: ParentRules): string[] {
  const out: string[] = [];
  for (const [parent, children] of Object.entries(rules)) {
    for (const child of children) if (violatesFixedRule(parent, child)) out.push(`${parent}>${child}`);
  }
  return out;
}
