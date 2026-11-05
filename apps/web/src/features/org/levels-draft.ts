import { fixedRuleViolations, ROOT_PARENT, type OrgLevelDto, type OrgLevelInput, type OrgLevelsDto } from '@arweqah-platform/shared';

/** One unit type as the window edits it: an existing type keeps its `id` and key, a new one has a temporary key (`new-1`) until the server names it. */
export interface TypeDraft {
  key: string;
  id?: string;
  nameAr: string;
  nameEn: string;
  acceptsTitles: boolean;
  isBuiltIn: boolean;
  unitsCount: number;
}

export interface LevelsDraft {
  types: TypeDraft[];
  rules: Record<string, string[]>;
}

const NEW_PREFIX = 'new-';
export const isNewKey = (key: string): boolean => key.startsWith(NEW_PREFIX);

export function draftFrom(data: OrgLevelsDto): LevelsDraft {
  const types = [...data.levels].sort((a, b) => a.sortOrder - b.sortOrder).map((l: OrgLevelDto) => ({ key: l.key, id: l.id, nameAr: l.nameAr, nameEn: l.nameEn, acceptsTitles: l.acceptsTitles, isBuiltIn: l.isBuiltIn, unitsCount: l.unitsCount }));
  return { types, rules: Object.fromEntries(Object.entries(data.rules).map(([k, v]) => [k, [...v]])) };
}

/** A pair of the table that a fixed rule forbids whatever is ticked: a sector only under the group, no office under an office. */
export const isFixedPair = (parent: string, child: string): boolean => fixedRuleViolations({ [parent]: [child] }).length > 0;

export function addType(draft: LevelsDraft, serial: number): LevelsDraft {
  const key = `${NEW_PREFIX}${serial}`;
  return { types: [...draft.types, { key, nameAr: '', nameEn: '', acceptsTitles: true, isBuiltIn: false, unitsCount: 0 }], rules: { ...draft.rules, [key]: [] } };
}

/** Removes a type and every mention of it in the table. */
export function removeType(draft: LevelsDraft, key: string): LevelsDraft {
  const rules = Object.fromEntries(Object.entries(draft.rules).filter(([parent]) => parent !== key).map(([parent, kids]) => [parent, kids.filter((k) => k !== key)]));
  return { types: draft.types.filter((t) => t.key !== key), rules };
}

export function patchType(draft: LevelsDraft, key: string, patch: Partial<TypeDraft>): LevelsDraft {
  return { ...draft, types: draft.types.map((t) => (t.key === key ? { ...t, ...patch } : t)) };
}

export function setPair(draft: LevelsDraft, parent: string, child: string, on: boolean): LevelsDraft {
  const current = draft.rules[parent] ?? [];
  const next = on ? [...new Set([...current, child])] : current.filter((k) => k !== child);
  return { ...draft, rules: { ...draft.rules, [parent]: next } };
}

/** Every allowed child under this parent, or none when they are all ticked already. */
export function toggleRow(draft: LevelsDraft, parent: string): LevelsDraft {
  const all = draft.types.map((t) => t.key).filter((child) => !isFixedPair(parent, child));
  const full = all.every((child) => (draft.rules[parent] ?? []).includes(child));
  return { ...draft, rules: { ...draft.rules, [parent]: full ? [] : all } };
}

/** The Arabic name must be there and differ from the others'. */
export function arabicNameProblem(draft: LevelsDraft, key: string): 'required' | 'duplicate' | null {
  const own = draft.types.find((t) => t.key === key)?.nameAr.trim() ?? '';
  if (own.length < 2) return 'required';
  return draft.types.some((t) => t.key !== key && t.nameAr.trim() === own) ? 'duplicate' : null;
}

export const englishNameProblem = (value: string): boolean => value.trim().length < 2;

export function isDraftValid(draft: LevelsDraft): boolean {
  return draft.types.every((t) => arabicNameProblem(draft, t.key) === null && !englishNameProblem(t.nameEn));
}

/** What the server is sent for the types (an added type has no id). */
export function toTypeInputs(draft: LevelsDraft): OrgLevelInput[] {
  return draft.types.map((t) => ({ ...(t.id ? { id: t.id } : {}), nameAr: t.nameAr.trim(), nameEn: t.nameEn.trim(), acceptsTitles: t.acceptsTitles }));
}

/** The rules to send once the server has named the added types: every temporary key becomes the key it got (found by its Arabic name). */
export function rulesForSave(draft: LevelsDraft, saved: OrgLevelDto[]): Record<string, string[]> {
  const known = new Set(saved.map((l) => l.key));
  const realKey = (key: string): string => (isNewKey(key) ? (saved.find((l) => l.nameAr === draft.types.find((t) => t.key === key)?.nameAr.trim())?.key ?? key) : key);
  const parents = [ROOT_PARENT, ...draft.types.map((t) => t.key)];
  const out: Record<string, string[]> = {};
  for (const parent of parents) {
    const real = realKey(parent);
    if (real !== ROOT_PARENT && !known.has(real)) continue;
    out[real] = (draft.rules[parent] ?? []).map(realKey).filter((child) => known.has(child));
  }
  return out;
}
