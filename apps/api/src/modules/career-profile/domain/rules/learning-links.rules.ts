import type { CareerContent, LearningImportReason, LearningImportRow, LearningImportRowResultDto } from '@arweqah-platform/shared';

/** A title that has a code, with its career content (null while nothing was saved). */
export interface CodedContent {
  titleId: string;
  version: number;
  content: CareerContent | null;
}

export interface LinksPlan {
  rows: LearningImportRowResultDto[];
  /** The titles whose content changes, with the new content and the version it was read at. */
  changes: { titleId: string; version: number; content: CareerContent; rows: number[] }[];
}

type Unit = CareerContent['learning']['periods'][number]['units'][number];
const key = (row: LearningImportRow): string => `${row.titleCode.toUpperCase()}\u0000${row.period}\u0000${row.unit}`;

/**
 * What each row of the learning-links sheet would do: a unit is found by the title's code, the period's name and the unit's name; its link is
 * set, cleared or already the same. A row names a unit once (a second row for it is refused), and nothing else of the path is touched.
 */
export function planLearningLinks(rows: readonly LearningImportRow[], byCode: ReadonlyMap<string, CodedContent>): LinksPlan {
  const seen = new Set<string>();
  const results: LearningImportRowResultDto[] = [];
  const edits = new Map<string, { source: CodedContent; links: Map<Unit, string>; rows: number[] }>();
  rows.forEach((row, i) => {
    const outcome = locate(row, byCode, seen);
    results.push(resultOf(i + 1, row, outcome));
    if (outcome.kind !== 'found') return;
    const edit = edits.get(outcome.source.titleId) ?? { source: outcome.source, links: new Map<Unit, string>(), rows: [] };
    edits.set(outcome.source.titleId, edit);
    if (outcome.unit.link !== row.link) {
      edit.links.set(outcome.unit, row.link);
      edit.rows.push(i + 1);
    }
  });
  return { rows: results, changes: [...edits.values()].filter((e) => e.links.size > 0).map(toChange) };
}

type Located = { kind: 'found'; source: CodedContent; unit: Unit } | { kind: 'rejected'; reason: LearningImportReason };

function locate(row: LearningImportRow, byCode: ReadonlyMap<string, CodedContent>, seen: Set<string>): Located {
  const source = byCode.get(row.titleCode.toUpperCase());
  if (!source) return { kind: 'rejected', reason: 'title_not_found' };
  if (!source.content) return { kind: 'rejected', reason: 'no_content' };
  if (seen.has(key(row))) return { kind: 'rejected', reason: 'duplicate_row' };
  seen.add(key(row));
  const period = source.content.learning.periods.find((p) => p.name === row.period);
  if (!period) return { kind: 'rejected', reason: 'period_not_found' };
  const units = period.units.filter((u) => u.title === row.unit);
  if (units.length === 0) return { kind: 'rejected', reason: 'unit_not_found' };
  if (units.length > 1) return { kind: 'rejected', reason: 'unit_ambiguous' };
  return { kind: 'found', source, unit: units[0] as Unit };
}

function resultOf(n: number, row: LearningImportRow, located: Located): LearningImportRowResultDto {
  if (located.kind === 'rejected') return { row: n, status: 'rejected', reason: located.reason };
  return { row: n, status: located.unit.link === row.link ? 'unchanged' : 'updated', reason: null };
}

function toChange(edit: { source: CodedContent; links: Map<Unit, string>; rows: number[] }): LinksPlan['changes'][number] {
  const content = edit.source.content as CareerContent;
  const periods = content.learning.periods.map((p) => ({ ...p, units: p.units.map((u) => (edit.links.has(u) ? { ...u, link: edit.links.get(u) as string } : u)) }));
  return { titleId: edit.source.titleId, version: edit.source.version, content: { ...content, learning: { ...content.learning, periods } }, rows: edit.rows };
}
