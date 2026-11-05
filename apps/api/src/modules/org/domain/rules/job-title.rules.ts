import { buildTitleCode, parseTitleCode, type TitleTrack } from '@arweqah-platform/shared';

/**
 * The next sequence number of the titles that share a unit, grade and track: one more than the highest used so far.
 * `codes` are all the codes ever issued (a deleted title's number is never reused).
 */
export function nextTitleSequence(codes: Iterable<string>, key: { unitCode: string; grade: number; track: TitleTrack }): number {
  let highest = 0;
  for (const code of codes) {
    const parsed = parseTitleCode(code);
    if (parsed && parsed.unitCode === key.unitCode && parsed.grade === key.grade && parsed.track === key.track) highest = Math.max(highest, parsed.sequence);
  }
  return highest + 1;
}

/** The code of a new title: unit code, grade, track and the next free sequence. */
export function nextTitleCode(codes: Iterable<string>, key: { unitCode: string; grade: number; track: TitleTrack }): string {
  return buildTitleCode(key.unitCode, key.grade, key.track, nextTitleSequence(codes, key));
}

/**
 * Whether making `titleId` report to `newUpId` would close a loop: the title is its own boss, or the new boss (directly or further up)
 * already reports to it. `upOf` is the current reporting line (title → the title it reports to, or null).
 */
export function createsCycle(upOf: ReadonlyMap<string, string | null>, titleId: string, newUpId: string): boolean {
  const seen = new Set<string>();
  for (let cursor: string | null | undefined = newUpId; cursor; cursor = upOf.get(cursor)) {
    if (cursor === titleId) return true;
    if (seen.has(cursor)) return false;
    seen.add(cursor);
  }
  return false;
}

/** A grade and track can be given once: only to a title that has neither (they build its frozen code). */
export function canSetGrade(current: { grade: number | null; track: TitleTrack | null }, next: { grade?: number | undefined; track?: TitleTrack | undefined }): boolean {
  if (next.grade === undefined && next.track === undefined) return true;
  return current.grade === null && current.track === null;
}
