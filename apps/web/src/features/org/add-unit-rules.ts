import { canCreateUnder, isValidCodePrefix, nextUnitCode, rootLevelCode, ROOT_PARENT, type ManagementMode, type OrgLevelDto, type OrgTreeDto } from '@arweqah-platform/shared';
import { canHaveChildren, inTreeOrder, type OrgNode } from './org-model';

/** What the person chose for how the new unit is managed: nothing yet (a unit under the group must choose), inherit, or an explicit mode. */
export type ModeChoice = '' | 'inherit' | ManagementMode;

/** The types the rules table allows under this parent (null = directly under the group). */
export function allowedLevels(tree: OrgTreeDto, parent: OrgNode | null): OrgLevelDto[] {
  const parentKey = parent ? parent.levelKey : ROOT_PARENT;
  return tree.levels.filter((l) => canCreateUnder(tree.rules, parentKey, l.key));
}

/** The parents a unit can be added under: the group, and every active unit whose type has at least one type allowed under it. */
export function parentChoices(tree: OrgTreeDto): { node: OrgNode | null; depth: number }[] {
  const units = inTreeOrder(tree.nodes).filter(({ node }) => node.isActive && canHaveChildren(tree, node.levelKey));
  return [{ node: null, depth: 0 }, ...units];
}

export type CodeProblem = 'prefix' | 'parentNoCode' | 'noSlot';

/** The code the new unit would get, or what stops it: a unit under the group takes the typed letters, any other the next free number in its slot. */
export function suggestCode(tree: OrgTreeDto, parent: OrgNode | null, level: OrgLevelDto | undefined, prefix: string): { code: string | null; problem: CodeProblem | null } {
  if (!level) return { code: null, problem: null };
  if (!parent) {
    const code = rootLevelCode(prefix);
    return { code, problem: isValidCodePrefix(prefix) ? null : 'prefix' };
  }
  if (!parent.code) return { code: null, problem: 'parentNoCode' };
  const siblingCodes = tree.nodes.filter((n) => n.parentId === parent.id && n.code).map((n) => n.code as string);
  const code = nextUnitCode({ parentCode: parent.code, parentType: parent.levelKey, childType: level.key, siblingCodes });
  return { code, problem: code ? null : 'noSlot' };
}

/** A unit under the group has no parent to inherit from: it must say how it is managed. Anywhere else the default is «inherit». */
export function resolveMode(underGroup: boolean, choice: ModeChoice): ModeChoice {
  if (underGroup) return choice === 'inherit' ? '' : choice;
  return choice === '' ? 'inherit' : choice;
}

/** How the unit will be managed once saved: its own choice, or what the parent has. */
export function effectiveModeOf(parent: OrgNode | null, choice: ModeChoice): ManagementMode | null {
  if (choice === 'shared' || choice === 'per_company') return choice;
  return choice === 'inherit' && parent ? parent.effectiveMode : null;
}
