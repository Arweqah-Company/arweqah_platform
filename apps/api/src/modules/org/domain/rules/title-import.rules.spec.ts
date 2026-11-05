import type { TitleImportRow } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { planTitleImport, type ImportContext, type KnownTitle } from './title-import.rules';

const LIST = { ar: [], en: [] };
const known = (code: string, over: Partial<KnownTitle> = {}): KnownTitle => ({ id: `id-${code}`, code, grade: 7, track: 'P', nameAr: 'محلل', nameEn: 'Analyst', reportsToCode: null, responsibilities: LIST, qualifications: LIST, kpis: LIST, ...over });
const context = (titles: KnownTitle[] = [], issued: string[] = []): ImportContext => ({
  unitsByCode: new Map([['OPS.03.03.01', { id: 'unit-1', acceptsTitles: true }], ['OPS.00.00.00', { id: 'sector', acceptsTitles: false }]]),
  titlesByCode: new Map(titles.map((t) => [t.code, t])),
  issuedCodes: new Set([...issued, ...titles.map((t) => t.code)]),
});
const row = (over: Partial<TitleImportRow> = {}): TitleImportRow => ({ nameAr: 'محاسب', nameEn: 'Accountant', ...over });
const plan = (rows: TitleImportRow[], ctx = context()) => planTitleImport(rows, ctx).map((p) => [p.row, p.status, p.code, p.reasons] as const);

describe('titles file: matching by code, creating and rejecting (FR-107)', () => {
  it('makes a title with exactly the code of its row, and builds one for a row without a code (the next sequence)', () => {
    expect(plan([row({ code: 'OPS.03.03.01-L7P-05' }), row({ unitCode: 'OPS.03.03.01', grade: 7, track: 'P' })], context([], ['OPS.03.03.01-L7P-05']))).toEqual([
      [1, 'rejected', 'OPS.03.03.01-L7P-05', ['sequence_taken']],
      [2, 'create', 'OPS.03.03.01-L7P-06', []],
    ]);
    expect(plan([row({ code: 'OPS.03.03.01-L7P-05' })])).toEqual([[1, 'create', 'OPS.03.03.01-L7P-05', []]]);
  });

  it('counts the rows of the same file when it builds codes, so two rows never get the same one', () => {
    const rows = [row({ unitCode: 'OPS.03.03.01', grade: 7, track: 'P' }), row({ nameAr: 'آخر', unitCode: 'OPS.03.03.01', grade: 7, track: 'P' })];
    expect(plan(rows).map(([, , code]) => code)).toEqual(['OPS.03.03.01-L7P-01', 'OPS.03.03.01-L7P-02']);
  });

  it('updates an existing title found by its code, and leaves it alone when nothing differs', () => {
    const existing = known('OPS.03.03.01-L7P-01');
    expect(plan([row({ code: existing.code, nameAr: 'اسم جديد', nameEn: 'New' })], context([existing]))[0]?.[1]).toBe('update');
    expect(plan([row({ code: existing.code, nameAr: 'محلل', nameEn: 'Analyst' })], context([existing]))[0]?.[1]).toBe('unchanged');
  });

  it('rejects a bad code, an unknown unit, a unit that takes no titles, a missing grade or track, and a grade that disagrees with the code', () => {
    const reasons = (r: TitleImportRow) => plan([r])[0]?.[3];
    expect(reasons(row({ code: 'nope' }))).toEqual(['bad_code']);
    expect(reasons(row({ code: 'XYZ.01.01.01-L7P-01' }))).toEqual(['unit_not_found']);
    expect(reasons(row({ code: 'OPS.00.00.00-L7P-01' }))).toEqual(['unit_not_accepting']);
    expect(reasons(row({ unitCode: 'OPS.03.03.01', track: 'P' }))).toEqual(['grade_required']);
    expect(reasons(row({ unitCode: 'OPS.03.03.01', grade: 7 }))).toEqual(['track_required']);
    expect(reasons(row({}))).toEqual(['unit_required']);
    expect(reasons(row({ code: 'OPS.03.03.01-L7P-01', grade: 6 }))).toEqual(['grade_track_mismatch']);
    expect(reasons(row({ code: 'OPS.03.03.01-L7P-01', unitCode: 'OPS.03.03.02' }))).toEqual(['unit_mismatch']);
  });

  it('marks a second row with the same code as a duplicate', () => {
    expect(plan([row({ code: 'OPS.03.03.01-L7P-01' }), row({ code: 'OPS.03.03.01-L7P-01' })]).map((p) => [p[1], p[3]])).toEqual([['create', []], ['rejected', ['duplicate_in_file']]]);
  });

  it('checks the reporting line: unknown title, itself, and loops (also through the file)', () => {
    const a = 'OPS.03.03.01-L7P-01';
    const b = 'OPS.03.03.01-L6P-01';
    const reasons = (rows: TitleImportRow[]) => plan(rows).map((p) => p[3]);
    expect(reasons([row({ code: a, reportsToCode: 'OPS.03.03.01-L1M-01' })])).toEqual([['reports_to_unknown']]);
    expect(reasons([row({ code: a, reportsToCode: a })])).toEqual([['reports_to_self']]);
    expect(reasons([row({ code: a, reportsToCode: b }), row({ code: b })])).toEqual([[], []]);
    expect(reasons([row({ code: a, reportsToCode: b }), row({ code: b, reportsToCode: a })])).toEqual([['reports_to_cycle'], ['reports_to_cycle']]);
  });

  it('rejects the rows that reported to a rejected row', () => {
    const rows = [row({ code: 'OPS.03.03.01-L7P-01', reportsToCode: 'OPS.03.03.01-L6P-01' }), row({ code: 'OPS.03.03.01-L6P-01', unitCode: 'OPS.03.03.02' })];
    expect(plan(rows).map((p) => [p[1], p[3]])).toEqual([['rejected', ['reports_to_unknown']], ['rejected', ['unit_mismatch']]]);
  });
});
