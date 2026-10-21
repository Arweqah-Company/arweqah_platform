import { Download, FileSpreadsheet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert, Button } from '@/shared/ui';
import { MAX_IMPORT_BYTES, MAX_IMPORT_ROWS, type ImportColumn } from './types';
import type { ImportFailure } from './use-import-flow';

interface ErrorItem {
  rowNumber: number;
  messages: string[];
}

export function ErrorList({ title, items }: { title: string; items: ErrorItem[] }) {
  const { t } = useTranslation();
  return (
    <section aria-label={title}>
      <h3 className="mb-2 text-sm font-bold">{title}</h3>
      <ul className="max-h-56 overflow-y-auto rounded-xl border border-neutral-200 text-sm">
        {items.slice(0, 100).map((item) => (
          <li key={item.rowNumber} className="border-b border-neutral-200 px-4 py-2 last:border-0">
            <span className="font-medium">{t('dataExchange.rowLabel', { row: item.rowNumber })}</span>
            <span className="text-muted"> — {item.messages.join(' · ')}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface PickProps {
  columns: ImportColumn[];
  checking: boolean;
  error: string | null;
  onTemplate: () => void;
  onFile: (file: File) => void;
}

export function PickStep({ columns, checking, error, onTemplate, onFile }: PickProps) {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex flex-col gap-1 rounded-xl border border-neutral-200 p-4">
        <Button variant="secondary" className="gap-2 self-start" onClick={onTemplate}><Download className="size-4" aria-hidden />{t('dataExchange.template')}</Button>
        <p className="mt-2 text-xs text-muted">{t('dataExchange.templateHint')}</p>
        <p className="text-xs text-muted">{columns.filter((c) => c.required).map((c) => c.header).join(' · ')} *</p>
      </div>
      <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-500 text-sm hover:bg-neutral-50">
        <FileSpreadsheet className="size-6 text-petrol-800" aria-hidden />
        {checking ? t('dataExchange.checking') : t('dataExchange.chooseFile')}
        <span className="text-xs text-muted">{t('dataExchange.fileHint', { rows: MAX_IMPORT_ROWS, mb: MAX_IMPORT_BYTES / 1024 / 1024 })}</span>
        <input type="file" className="sr-only" accept=".xlsx,.csv" disabled={checking} onChange={(e) => { const file = e.target.files?.[0]; if (file) onFile(file); e.target.value = ''; }} />
      </label>
      {error && <Alert>{error}</Alert>}
    </>
  );
}

interface PreviewProps {
  validCount: number;
  invalid: { rowNumber: number; errors: string[] }[];
  total: number;
  onStart: () => void;
  onAnother: () => void;
}

export function PreviewStep({ validCount, invalid, total, onStart, onAnother }: PreviewProps) {
  const { t } = useTranslation();
  return (
    <>
      <Alert tone={invalid.length ? 'info' : 'success'}>{t('dataExchange.summary', { valid: validCount, invalid: invalid.length, total })} {invalid.length > 0 && t('dataExchange.onlyValid')}</Alert>
      {invalid.length > 0 && <ErrorList title={t('dataExchange.errorsTitle')} items={invalid.map((r) => ({ rowNumber: r.rowNumber, messages: r.errors }))} />}
      <div className="flex gap-3">
        <Button disabled={validCount === 0} onClick={onStart}>{t('dataExchange.startImport', { count: validCount })}</Button>
        <Button variant="secondary" onClick={onAnother}>{t('dataExchange.another')}</Button>
      </div>
    </>
  );
}

export function RunningStep({ done, total }: { done: number; total: number }) {
  const { t } = useTranslation();
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-2">
      <p className="text-sm">{t('dataExchange.importing', { done, total })}</p>
      <progress className="h-2 w-full accent-petrol-800" value={done} max={Math.max(1, total)} aria-label={t('dataExchange.importing', { done, total })} />
    </div>
  );
}

interface DoneProps {
  imported: number;
  failures: ImportFailure[];
  onClose: () => void;
  onReport: () => void;
  onAnother: () => void;
}

export function DoneStep({ imported, failures, onClose, onReport, onAnother }: DoneProps) {
  const { t } = useTranslation();
  return (
    <>
      <Alert tone={failures.length ? 'info' : 'success'}>{t('dataExchange.result', { ok: imported, failed: failures.length })}</Alert>
      {failures.length > 0 && <ErrorList title={t('dataExchange.resultFailed')} items={failures.map((f) => ({ rowNumber: f.rowNumber, messages: [f.message] }))} />}
      <div className="flex gap-3">
        <Button onClick={onClose}>{t('dataExchange.done')}</Button>
        {failures.length > 0 && <Button variant="secondary" onClick={onReport}>{t('dataExchange.downloadErrors')}</Button>}
        <Button variant="ghost" onClick={onAnother}>{t('dataExchange.another')}</Button>
      </div>
    </>
  );
}
