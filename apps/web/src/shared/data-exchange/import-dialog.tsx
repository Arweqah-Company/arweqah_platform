import { useTranslation } from 'react-i18next';
import { Dialog } from '@/shared/ui';
import { toCsv } from './csv';
import { downloadBlob } from './export-file';
import { DoneStep, PickStep, PreviewStep, RunningStep } from './import-steps';
import { buildTemplateBlob } from './template';
import type { ImportColumn, PreparedRow, SheetRow } from './types';
import { useImportFlow, type BatchCommit } from './use-import-flow';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** File name stem for the template, e.g. "employees". */
  filename: string;
  columns: ImportColumn[];
  /** Turns the rows of the uploaded file into checked rows: errors, or a `run` that saves the row. */
  prepare: (rows: SheetRow[]) => PreparedRow[] | Promise<PreparedRow[]>;
  onImported?: () => void;
  /** Saves all the valid rows with one call (a server that decides the file as a whole); without it every row has its own `run`. */
  commit?: BatchCommit;
  /** A line under the summary of the preview (what the server says the file would do). */
  previewNote?: string;
  /** Words of the dialog when it is not the plain «import» (the update mode says what it does). */
  title?: string;
  description?: string;
}

/** Download the template, upload it filled in, see which rows are wrong, import the rest, get a report. */
export function ImportDialog({ open, onOpenChange, filename, columns, prepare, onImported, commit, previewNote, title, description }: ImportDialogProps) {
  const { t } = useTranslation();
  const flow = useImportFlow(columns, prepare, onImported, commit);
  const template = async () => downloadBlob(await buildTemplateBlob(columns, { template: t('dataExchange.sheetTemplate'), lists: t('dataExchange.sheetLists') }), `${filename}-template.xlsx`);
  const report = () => downloadBlob(new Blob([toCsv([t('dataExchange.rowColumn'), t('dataExchange.errorColumn')], flow.failures.map((f) => [f.rowNumber, f.message]))], { type: 'text/csv;charset=utf-8' }), 'import-errors.csv');
  const close = (next: boolean) => {
    if (!next && flow.phase === 'running') return;
    if (!next) flow.reset();
    onOpenChange(next);
  };
  const steps = {
    pick: <PickStep columns={columns} checking={false} error={flow.fileError} onTemplate={() => void template()} onFile={(f) => void flow.choose(f)} />,
    checking: <PickStep columns={columns} checking error={flow.fileError} onTemplate={() => void template()} onFile={(f) => void flow.choose(f)} />,
    preview: <PreviewStep note={previewNote} validCount={flow.valid.length} invalid={flow.invalid} total={flow.rows.length} onStart={() => void flow.start()} onAnother={flow.reset} />,
    running: <RunningStep done={flow.progress} total={flow.valid.length} />,
    done: <DoneStep imported={flow.valid.length - flow.failures.length} failures={flow.failures} onClose={() => close(false)} onReport={report} onAnother={flow.reset} />,
  };

  return (
    <Dialog open={open} onOpenChange={close} title={title ?? t('dataExchange.importTitle')} description={description ?? t('dataExchange.importDescription')}>
      <div className="flex flex-col gap-5">{steps[flow.phase]}</div>
    </Dialog>
  );
}
