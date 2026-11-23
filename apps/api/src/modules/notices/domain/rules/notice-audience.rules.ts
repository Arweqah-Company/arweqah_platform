/** One rule of an audience, as stored and as sent. */
export interface AudienceLike {
  type: string;
  refId?: string | null;
  includeBelow?: boolean;
}

/** The rules split by kind, as the audience queries take them. */
export interface AudienceSets {
  all: boolean;
  /** Units whose employees receive the notice, with the units below them. */
  unitsWithBelow: string[];
  /** Units whose own employees only receive it. */
  unitsExact: string[];
  titles: string[];
  groups: string[];
}

const unique = (ids: (string | null | undefined)[]): string[] => [...new Set(ids.filter((id): id is string => !!id))];

/** `all` makes every other rule redundant; a rule listed twice counts once. */
export function audienceSets(rules: readonly AudienceLike[]): AudienceSets {
  const of = (type: string, below?: boolean) => unique(rules.filter((r) => r.type === type && (below === undefined || !!r.includeBelow === below)).map((r) => r.refId));
  return { all: rules.some((r) => r.type === 'all'), unitsWithBelow: of('unit', true), unitsExact: of('unit', false), titles: of('title'), groups: of('people_group') };
}

/** The ids a set of rules names, by kind, to check that each exists. */
export function referencedIds(rules: readonly AudienceLike[]): { units: string[]; titles: string[]; groups: string[] } {
  const sets = audienceSets(rules);
  return { units: unique([...sets.unitsWithBelow, ...sets.unitsExact]), titles: sets.titles, groups: sets.groups };
}

/** The rules as stored: `all` alone when it is there, each other rule once. */
export function normalizeAudience(rules: readonly AudienceLike[]): { type: string; refId: string | null; includeBelow: boolean }[] {
  if (rules.some((r) => r.type === 'all')) return [{ type: 'all', refId: null, includeBelow: false }];
  const seen = new Set<string>();
  const result: { type: string; refId: string | null; includeBelow: boolean }[] = [];
  for (const rule of rules) {
    const key = `${rule.type}:${rule.refId ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ type: rule.type, refId: rule.refId ?? null, includeBelow: rule.type === 'unit' ? !!rule.includeBelow : false });
  }
  return result;
}
