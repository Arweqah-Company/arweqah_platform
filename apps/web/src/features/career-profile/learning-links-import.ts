import { learningImportRowSchema, type LearningImportReason, type LearningImportRow } from '@arweqah-platform/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RowChecker, zodMessages } from '@/shared/data-exchange/mapping';
import type { ImportColumn, PreparedRow, SheetRow } from '@/shared/data-exchange/types';
import type { ImportFailure } from '@/shared/data-exchange/use-import-flow';
import { CAREER_LIST_KEY, CAREER_TITLES_KEY, importLearningLinks } from './api';

type Translate = ReturnType<typeof useTranslation>['t'];

/** One row of the sheet as the server's row; the problems found on the way are in `errors`. */
function toRow(row: SheetRow, headers: Record<string, string>, t: Translate): { errors: string[]; row?: LearningImportRow } {
  const check = new RowChecker(t, row.cells, headers);
  const input = { titleCode: check.text('titleCode', true) ?? '', period: check.text('period', true) ?? '', unit: check.text('unit', true) ?? '', link: check.text('link') ?? '' };
  const parsed = learningImportRowSchema.safeParse(input);
  const errors = [...check.errors, ...(check.errors.length || parsed.success ? [] : zodMessages(parsed.error, headers, t))];
  return { errors, row: errors.length || !parsed.success ? undefined : parsed.data };
}

/**
 * Import of the learning links from a file: one row per learning unit (the title's code, the period, the unit) with its address. The server decides
 * (it finds each unit), so the preview is its dry run and the import is one call; a row it refuses comes back with its reason and its number in the sheet.
 */
export function useLearningLinksImport() {
  const { t } = useTranslation('career-profile');
  const { t: tc } = useTranslation();
  const client = useQueryClient();
  const columns: ImportColumn[] = [
    { id: 'titleCode', header: t('import.titleCode'), required: true, hint: t('import.titleCodeHint') },
    { id: 'period', header: t('import.period'), required: true },
    { id: 'unit', header: t('import.unit'), required: true },
    { id: 'link', header: t('import.link'), hint: t('import.linkHint') },
  ];
  const headers = Object.fromEntries(columns.map((c) => [c.id, c.header]));
  const sent = useRef<{ rowNumber: number; row: LearningImportRow }[]>([]);
  const [note, setNote] = useState<string | undefined>();
  const reason = (r: LearningImportReason | null) => (r ? t(`import.reason.${r}`) : '');

  const prepare = async (rows: SheetRow[]): Promise<PreparedRow[]> => {
    const checked = rows.map((r) => ({ rowNumber: r.rowNumber, ...toRow(r, headers, tc) }));
    sent.current = checked.flatMap((c) => (c.row ? [{ rowNumber: c.rowNumber, row: c.row }] : []));
    const preview = sent.current.length ? await importLearningLinks({ rows: sent.current.map((s) => s.row), dryRun: true }) : null;
    setNote(preview ? t('import.preview', { updated: preview.updated, unchanged: preview.unchanged }) : undefined);
    const byNumber = new Map(preview?.rows.map((r) => [sent.current[r.row - 1]?.rowNumber, r]) ?? []);
    return checked.map((c) => {
      const errors = c.row ? (byNumber.get(c.rowNumber)?.status === 'rejected' ? [reason(byNumber.get(c.rowNumber)?.reason ?? null)] : []) : c.errors;
      return { rowNumber: c.rowNumber, errors, run: errors.length ? undefined : async () => undefined };
    });
  };

  /** The whole sheet goes in one call; a refusal counts only for a row the preview let through (the others were already shown). */
  const commit = async (valid: PreparedRow[]): Promise<ImportFailure[]> => {
    const result = await importLearningLinks({ rows: sent.current.map((s) => s.row), dryRun: false });
    const expected = new Set(valid.map((r) => r.rowNumber));
    return result.rows
      .map((r) => ({ rowNumber: sent.current[r.row - 1]?.rowNumber ?? r.row, rejected: r.status === 'rejected', message: reason(r.reason) }))
      .filter((f) => f.rejected && expected.has(f.rowNumber))
      .map(({ rowNumber, message }) => ({ rowNumber, message }));
  };

  return { filename: 'career-learning-links', columns, prepare, commit, previewNote: note, onImported: () => void Promise.all([CAREER_TITLES_KEY, CAREER_LIST_KEY, 'career-profile'].map((key) => client.invalidateQueries({ queryKey: [key] }))) };
}
