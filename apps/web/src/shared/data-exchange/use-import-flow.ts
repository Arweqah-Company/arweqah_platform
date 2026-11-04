import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '@/shared/lib/error-message';
import { ImportFileError, readImportFile } from './read-sheet';
import type { ImportColumn, PreparedRow, SheetRow } from './types';

export type ImportPhase = 'pick' | 'checking' | 'preview' | 'running' | 'done';
export interface ImportFailure {
  rowNumber: number;
  message: string;
}

const CONCURRENCY = 3;

/** Runs the jobs a few at a time and reports progress after each one. */
async function runPool(jobs: (() => Promise<void>)[], onProgress: (done: number) => void): Promise<void> {
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next++] as () => Promise<void>;
      await job();
      onProgress(++done);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));
}

interface RunResult {
  failures: ImportFailure[];
}

/** Saves the valid rows a few at a time; a row that throws is reported, the others carry on. */
async function runRows(rows: PreparedRow[], describe: (error: unknown) => string, onProgress: (done: number) => void): Promise<RunResult> {
  const failures: ImportFailure[] = [];
  await runPool(
    rows.map((row) => async () => {
      try {
        await (row.run as () => Promise<void>)();
      } catch (error) {
        failures.push({ rowNumber: row.rowNumber, message: describe(error) });
      }
    }),
    onProgress,
  );
  return { failures: failures.sort((a, b) => a.rowNumber - b.rowNumber) };
}

/** pick a file → check every row → import the valid rows → report what failed. */
export function useImportFlow(columns: ImportColumn[], prepare: (rows: SheetRow[]) => PreparedRow[] | Promise<PreparedRow[]>, onImported?: () => void) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<ImportPhase>('pick');
  const [fileError, setFileError] = useState<string | null>(null);
  const [rows, setRows] = useState<PreparedRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [failures, setFailures] = useState<ImportFailure[]>([]);

  const choose = async (file: File) => {
    setPhase('checking');
    setFileError(null);
    try {
      setRows(await prepare(await readImportFile(file, columns)));
      setPhase('preview');
    } catch (error) {
      setFileError(error instanceof ImportFileError ? t(`dataExchange.file.${error.reason}`, { detail: error.detail }) : t('dataExchange.file.unreadable'));
      setPhase('pick');
    }
  };

  const start = async () => {
    setPhase('running');
    setProgress(0);
    setFailures((await runRows(rows.filter((r) => r.run), (error) => errorMessage(t, error), setProgress)).failures);
    setPhase('done');
    onImported?.();
  };

  const reset = () => {
    setPhase('pick');
    setRows([]);
    setFailures([]);
    setFileError(null);
  };

  return { phase, fileError, rows, valid: rows.filter((r) => r.run), invalid: rows.filter((r) => !r.run), progress, failures, choose, start, reset };
}
