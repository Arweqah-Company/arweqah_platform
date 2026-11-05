import { parseTitleCode, type TitleImportReason, type TitleImportRow, type TitleTrack } from '@arweqah-platform/shared';
import type { TitleContent } from '../types/org.types';
import { nextTitleCode } from './job-title.rules';

export interface KnownUnit {
  id: string;
  acceptsTitles: boolean;
}

/** An existing title as the planner sees it: its reporting line by code, so a file can name titles it also defines. */
export interface KnownTitle extends TitleContent {
  id: string;
  code: string;
  grade: number;
  track: TitleTrack;
  nameAr: string;
  nameEn: string;
  reportsToCode: string | null;
}

export interface ImportContext {
  /** Live units by their code. */
  unitsByCode: ReadonlyMap<string, KnownUnit>;
  /** Live titles that have a code, by it. */
  titlesByCode: ReadonlyMap<string, KnownTitle>;
  /** Every code ever issued, deleted titles' included (a number is never reused). */
  issuedCodes: ReadonlySet<string>;
}

export interface PlannedCreate {
  unitId: string;
  code: string;
  grade: number;
  track: TitleTrack;
  row: TitleImportRow;
}

export interface PlannedUpdate {
  existing: KnownTitle;
  row: TitleImportRow;
}

export type RowPlan =
  | { row: number; status: 'create'; code: string; create: PlannedCreate; reasons: [] }
  | { row: number; status: 'update'; code: string; update: PlannedUpdate; reasons: [] }
  | { row: number; status: 'unchanged'; code: string; reasons: [] }
  | { row: number; status: 'rejected'; code: string | null; reasons: TitleImportReason[] };

const rejected = (row: number, code: string | null, reason: TitleImportReason): RowPlan => ({ row, status: 'rejected', code, reasons: [reason] });
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

function contentChanged(existing: KnownTitle, row: TitleImportRow): boolean {
  return !!row.content && !same(row.content, { responsibilities: existing.responsibilities, qualifications: existing.qualifications, kpis: existing.kpis });
}

/** A row that gives a unit or a grade and track must agree with the code it names. */
function disagreesWithCode(row: TitleImportRow, parsed: { unitCode: string; grade: number; track: TitleTrack }): TitleImportReason | null {
  if (row.unitCode && row.unitCode !== parsed.unitCode) return 'unit_mismatch';
  const gradeDiffers = row.grade != null && row.grade !== parsed.grade;
  const trackDiffers = row.track != null && row.track !== parsed.track;
  return gradeDiffers || trackDiffers ? 'grade_track_mismatch' : null;
}

/** A row whose code names a title that exists: names, reporting line and content may change; the grade and track (the code) never. */
function planExisting(number: number, row: TitleImportRow, existing: KnownTitle): RowPlan {
  const parsed = parseTitleCode(existing.code);
  const problem = parsed ? disagreesWithCode(row, parsed) : null;
  if (problem) return rejected(number, existing.code, problem);
  const reportsChanged = row.reportsToCode !== undefined && (row.reportsToCode ?? null) !== existing.reportsToCode;
  const changed = row.nameAr !== existing.nameAr || row.nameEn !== existing.nameEn || reportsChanged || contentChanged(existing, row);
  return changed ? { row: number, status: 'update', code: existing.code, update: { existing, row }, reasons: [] } : { row: number, status: 'unchanged', code: existing.code, reasons: [] };
}

function unitProblem(unit: KnownUnit | undefined): TitleImportReason | null {
  if (!unit) return 'unit_not_found';
  return unit.acceptsTitles ? null : 'unit_not_accepting';
}

/** A row that gives its own code and the title does not exist yet: made with exactly that code. */
function planNewWithCode(number: number, row: TitleImportRow, code: string, context: ImportContext): RowPlan {
  const parsed = parseTitleCode(code);
  if (!parsed) return rejected(number, code, 'bad_code');
  const unit = context.unitsByCode.get(parsed.unitCode);
  const problem = disagreesWithCode(row, parsed) ?? unitProblem(unit) ?? (context.issuedCodes.has(code) ? 'sequence_taken' : null);
  if (problem || !unit) return rejected(number, code, problem ?? 'unit_not_found');
  return { row: number, status: 'create', code, create: { unitId: unit.id, code, grade: parsed.grade, track: parsed.track, row }, reasons: [] };
}

/** A row with no code: the unit, grade and track build one (the next free sequence, counting what this file already planned). */
function planNewWithoutCode(number: number, row: TitleImportRow, context: ImportContext, issued: ReadonlySet<string>): RowPlan {
  if (!row.unitCode) return rejected(number, null, 'unit_required');
  if (row.grade == null) return rejected(number, null, 'grade_required');
  if (!row.track) return rejected(number, null, 'track_required');
  const unit = context.unitsByCode.get(row.unitCode);
  const problem = unitProblem(unit);
  if (problem || !unit) return rejected(number, null, problem ?? 'unit_not_found');
  const code = nextTitleCode(issued, { unitCode: row.unitCode, grade: row.grade, track: row.track });
  return { row: number, status: 'create', code, create: { unitId: unit.id, code, grade: row.grade, track: row.track, row }, reasons: [] };
}

function planRow(number: number, row: TitleImportRow, context: ImportContext, issued: ReadonlySet<string>): RowPlan {
  const code = row.code?.trim() || null;
  if (!code) return planNewWithoutCode(number, row, context, issued);
  const existing = context.titlesByCode.get(code);
  return existing ? planExisting(number, row, existing) : planNewWithCode(number, row, code, context);
}

/** The reporting line after the file: existing titles with the file's changes, and the new ones. */
function finalLines(plans: readonly RowPlan[], context: ImportContext): Map<string, string | null> {
  const up = new Map([...context.titlesByCode].map(([code, t]) => [code, t.reportsToCode] as const));
  for (const plan of plans) {
    if (plan.status === 'create') up.set(plan.code, plan.create.row.reportsToCode ?? null);
    if (plan.status === 'update' && plan.update.row.reportsToCode !== undefined) up.set(plan.code, plan.update.row.reportsToCode);
  }
  return up;
}

function reportsToOf(plan: RowPlan): string | null | undefined {
  if (plan.status === 'create') return plan.create.row.reportsToCode;
  return plan.status === 'update' ? plan.update.row.reportsToCode : undefined;
}

function loops(up: ReadonlyMap<string, string | null>, start: string): boolean {
  const seen = new Set<string>();
  for (let cursor: string | null | undefined = up.get(start); cursor; cursor = up.get(cursor)) {
    if (cursor === start) return true;
    if (seen.has(cursor)) return false;
    seen.add(cursor);
  }
  return false;
}

/** The reporting line of a row must name a known title, not itself, and not close a loop. */
function reportsProblem(plan: RowPlan, up: ReadonlyMap<string, string | null>): TitleImportReason | null {
  const target = reportsToOf(plan);
  if (!target || plan.status === 'rejected' || plan.status === 'unchanged') return null;
  if (target === plan.code) return 'reports_to_self';
  if (!up.has(target)) return 'reports_to_unknown';
  return loops(up, plan.code) ? 'reports_to_cycle' : null;
}

/** Marks a second row for the same code as a duplicate (the first one stands). */
function markDuplicates(plans: RowPlan[]): RowPlan[] {
  const seen = new Set<string>();
  return plans.map((plan) => {
    if (plan.status === 'rejected' || !plan.code) return plan;
    if (seen.has(plan.code)) return rejected(plan.row, plan.code, 'duplicate_in_file');
    seen.add(plan.code);
    return plan;
  });
}

/** Rejects the rows whose reporting line is wrong; a rejected row may be what another row reported to, so the check repeats until nothing changes. */
function rejectBadReportingLines(plans: RowPlan[], context: ImportContext): RowPlan[] {
  let current = plans;
  for (;;) {
    const up = finalLines(current, context);
    const next = current.map((plan) => {
      const problem = reportsProblem(plan, up);
      return problem ? rejected(plan.row, plan.code, problem) : plan;
    });
    if (next.every((plan, i) => plan === current[i])) return next;
    current = next;
  }
}

/**
 * Plans a whole titles file without touching anything: every row becomes a title to create, to update, unchanged, or rejected with its reasons (stable codes).
 * Rows are matched by code; a row without one builds it from its unit, grade and track.
 */
export function planTitleImport(rows: readonly TitleImportRow[], context: ImportContext): RowPlan[] {
  const issued = new Set(context.issuedCodes);
  const first = rows.map((row, i) => {
    const plan = planRow(i + 1, row, context, issued);
    if (plan.status === 'create') issued.add(plan.code);
    return plan;
  });
  return rejectBadReportingLines(markDuplicates(first), context);
}
