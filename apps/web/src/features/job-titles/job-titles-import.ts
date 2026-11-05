import { TITLE_TRACKS, titleImportRowSchema, type TitleImportReason, type TitleImportResultDto, type TitleImportRow, type TitleTrack } from '@arweqah-platform/shared';
import i18n from 'i18next';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { dropdownOf, RowChecker, zodMessages, type Choice } from '@/shared/data-exchange/mapping';
import type { ImportColumn, PreparedRow, SheetRow } from '@/shared/data-exchange/types';
import type { ImportFailure } from '@/shared/data-exchange/use-import-flow';
import { linesOf } from '@/shared/lib/lines';
import { importTitles, useUnitsByType } from './api';

/** The track in both languages and by its letter, so a cell may name it any of these ways. */
const trackChoices = (current: string): Choice[] =>
  TITLE_TRACKS.map((track) => ({ id: track, labels: [i18n.getFixedT(current)(`job-titles:titles.tracks.${track}`), i18n.getFixedT(current === 'ar' ? 'en' : 'ar')(`job-titles:titles.tracks.${track}`), track] }));

const GRADE_CELL = /^L?\s*([1-9])$/i;

/** A list cell: one item per line (a `|` also separates items). */
const cellLines = (text: string | null): string[] => (text ? text.split('|').flatMap(linesOf) : []);

interface ContentCells { responsibilitiesAr: string | null; responsibilitiesEn: string | null; qualificationsAr: string | null; qualificationsEn: string | null; kpisAr: string | null; kpisEn: string | null }

/** The content of the title, or none when every content cell is empty (so a file without content never overwrites it). */
function contentOf(cells: ContentCells): TitleImportRow['content'] {
  const all = Object.values(cells);
  if (all.every((c) => !c)) return undefined;
  return {
    responsibilities: { ar: cellLines(cells.responsibilitiesAr), en: cellLines(cells.responsibilitiesEn) },
    qualifications: { ar: cellLines(cells.qualificationsAr), en: cellLines(cells.qualificationsEn) },
    kpis: { ar: cellLines(cells.kpisAr), en: cellLines(cells.kpisEn) },
  };
}

function useColumns(): ImportColumn[] {
  const { t, i18n: lang } = useTranslation('job-titles');
  const { t: tc } = useTranslation();
  const tree = useUnitsByType().data;
  const accepting = new Set((tree?.levels ?? []).filter((l) => l.acceptsTitles).map((l) => l.id));
  const unitCodes = (tree?.nodes ?? []).filter((n) => n.code && accepting.has(n.levelId)).map((n) => n.code as string);
  return [
    { id: 'code', header: t('import.code'), hint: t('import.codeHint') },
    { id: 'unitCode', header: t('import.unitCode'), options: unitCodes, hint: t('import.unitCodeHint') },
    { id: 'nameAr', header: t('titles.nameAr'), required: true },
    { id: 'nameEn', header: t('titles.nameEn'), required: true },
    { id: 'grade', header: t('titles.grade'), options: Array.from({ length: 9 }, (_, i) => `L${i + 1}`) },
    { id: 'track', header: t('titles.track'), options: dropdownOf(trackChoices(lang.language)) },
    { id: 'reportsToCode', header: t('import.reportsToCode'), hint: t('import.reportsToHint') },
    ...(['responsibilities', 'qualifications', 'kpis'] as const).flatMap((kind) => (['Ar', 'En'] as const).map((l) => ({ id: `${kind}${l}`, header: `${t(`card.${kind}`)} (${tc(`language.${l.toLowerCase()}`)})`, hint: t('import.linesHint') }))),
  ];
}

type Translate = ReturnType<typeof useTranslation>['t'];

/** «L7» or «7» is grade 7; anything else in the cell is reported. */
function gradeOf(check: RowChecker, headers: Record<string, string>, tc: Translate): number | null {
  const text = check.text('grade');
  if (text === null) return null;
  const match = GRADE_CELL.exec(text);
  if (!match) check.errors.push(tc('dataExchange.cell.unknownOption', { column: headers.grade, value: text }));
  return match ? Number(match[1]) : null;
}

const upper = (value: string | null): string | null => (value === null ? null : value.toUpperCase());

/** One row of the sheet as the server's import row; the problems found on the way are in `errors`. */
function toImportRow(row: SheetRow, headers: Record<string, string>, tc: Translate, language: string) {
  const check = new RowChecker(tc, row.cells, headers);
  const input = {
    code: upper(check.text('code')),
    unitCode: upper(check.text('unitCode')),
    nameAr: check.text('nameAr', true) ?? '',
    nameEn: check.text('nameEn', true) ?? '',
    grade: gradeOf(check, headers, tc),
    track: check.choice('track', trackChoices(language)) as TitleTrack | null,
    reportsToCode: upper(check.text('reportsToCode')),
    content: contentOf({ responsibilitiesAr: check.text('responsibilitiesAr'), responsibilitiesEn: check.text('responsibilitiesEn'), qualificationsAr: check.text('qualificationsAr'), qualificationsEn: check.text('qualificationsEn'), kpisAr: check.text('kpisAr'), kpisEn: check.text('kpisEn') }),
  };
  const parsed = titleImportRowSchema.safeParse(input);
  const errors = [...check.errors, ...(check.errors.length || parsed.success ? [] : zodMessages(parsed.error, headers, tc))];
  return { errors, row: errors.length || !parsed.success ? undefined : parsed.data };
}

/** The sentence a stable reason code stands for. */
const reasonText = (t: Translate, reasons: TitleImportReason[]): string[] => reasons.map((r) => t(`import.reason.${r}`));

/**
 * Import of job titles from a file. The server decides the file as a whole (one row may report to another row of the same file),
 * so the preview is its dry run and the import is one call: the rows it would refuse come back with their reason and the row's number in the sheet.
 */
export function useTitlesImport() {
  const { t, i18n: lang } = useTranslation('job-titles');
  const { t: tc } = useTranslation();
  const client = useQueryClient();
  const columns = useColumns();
  const headers = Object.fromEntries(columns.map((c) => [c.id, c.header]));
  const sent = useRef<{ rowNumber: number; row: TitleImportRow }[]>([]);
  const [counts, setCounts] = useState<TitleImportResultDto | null>(null);

  const prepare = async (rows: SheetRow[]): Promise<PreparedRow[]> => {
    const checked = rows.map((r) => ({ rowNumber: r.rowNumber, ...toImportRow(r, headers, tc, lang.language) }));
    sent.current = checked.flatMap((c) => (c.row ? [{ rowNumber: c.rowNumber, row: c.row }] : []));
    const preview = sent.current.length ? await importTitles({ dryRun: true, rows: sent.current.map((s) => s.row) }) : null;
    setCounts(preview);
    const byNumber = new Map(preview?.rows.map((r) => [sent.current[r.row - 1]?.rowNumber, r]) ?? []);
    return checked.map((c) => {
      const server = byNumber.get(c.rowNumber);
      const errors = c.row ? (server?.status === 'rejected' ? reasonText(t, server.reasons) : []) : c.errors;
      return { rowNumber: c.rowNumber, errors, run: errors.length ? undefined : async () => undefined };
    });
  };

  /** The whole file goes again (a row may report to another row of it); a refusal counts only for a row the preview let through, the others were already shown. */
  const commit = async (valid: PreparedRow[]): Promise<ImportFailure[]> => {
    const result = await importTitles({ dryRun: false, rows: sent.current.map((s) => s.row) });
    const expected = new Set(valid.map((r) => r.rowNumber));
    const failures = result.rows.map((r) => ({ rowNumber: sent.current[r.row - 1]?.rowNumber ?? r.row, rejected: r.status === 'rejected', message: reasonText(t, r.reasons).join(' · ') }));
    return failures.filter((f) => f.rejected && expected.has(f.rowNumber)).map(({ rowNumber, message }) => ({ rowNumber, message }));
  };

  const previewNote = counts ? t('import.preview', { created: counts.created, updated: counts.updated, unchanged: counts.unchanged }) : undefined;
  return { filename: 'job-titles', columns, prepare, commit, previewNote, onImported: () => void Promise.all(['org', 'job-titles', 'lookups', 'employees'].map((key) => client.invalidateQueries({ queryKey: [key] }))) };
}
