import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Dialog } from '@/shared/ui';
import { buildExportBlob, downloadBlob, exportFilename } from './export-file';
import { MAX_EXPORT_ROWS, type ExportColumn, type ExportFormat } from './types';

type Scope = 'page' | 'all';

interface ExportDialogProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: ExportColumn<T>[];
  /** File name without date and extension, e.g. "employees". */
  filename: string;
  /** The rows on screen; the "page" scope exports exactly these. */
  pageRows: T[];
  /** Total results of the current search and filters. */
  total: number;
  /** Every result of the current search and filters (the "all" scope). */
  loadAll: () => Promise<T[]>;
}

function Choice({ name, checked, onChange, children }: { name: string; checked: boolean; onChange: () => void; children: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 px-4 text-sm has-[:checked]:border-link has-[:checked]:bg-petrol-50">
      <input type="radio" name={name} className="size-4 accent-petrol-800" checked={checked} onChange={onChange} />
      {children}
    </label>
  );
}

/** Scope (page or all results), columns and file type; the file is built in the browser from what the list already returns. */
export function ExportDialog<T>({ open, onOpenChange, columns, filename, pageRows, total, loadAll }: ExportDialogProps<T>) {
  const { t } = useTranslation();
  const [scope, setScope] = useState<Scope>('page');
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [selected, setSelected] = useState<Set<string>>(() => new Set(columns.map((c) => c.id)));
  const [state, setState] = useState<'idle' | 'busy' | 'failed'>('idle');
  const chosen = columns.filter((c) => selected.has(c.id));
  const toggle = (id: string) => setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const run = async () => {
    setState('busy');
    try {
      const rows = scope === 'all' ? await loadAll() : pageRows;
      downloadBlob(await buildExportBlob(format, chosen, rows), exportFilename(filename, format));
      setState('idle');
      onOpenChange(false);
    } catch {
      setState('failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('dataExchange.exportTitle')} description={t('dataExchange.exportDescription')}>
      <div className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">{t('dataExchange.scope')}</legend>
          <Choice name="scope" checked={scope === 'page'} onChange={() => setScope('page')}>{t('dataExchange.scopePage', { count: pageRows.length })}</Choice>
          <Choice name="scope" checked={scope === 'all'} onChange={() => setScope('all')}>{t('dataExchange.scopeAll', { count: total })}</Choice>
          {scope === 'all' && total > MAX_EXPORT_ROWS && <p className="text-xs text-muted">{t('dataExchange.exportCap', { max: MAX_EXPORT_ROWS })}</p>}
        </fieldset>
        <fieldset>
          <legend className="mb-1 flex w-full items-center justify-between text-sm font-medium">
            {t('dataExchange.columns')}
            <span className="text-xs font-normal text-muted">{t('dataExchange.columnsCount', { selected: chosen.length, total: columns.length })}</span>
          </legend>
          <div className="mb-2 flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set(columns.map((c) => c.id)))}>{t('dataExchange.selectAll')}</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>{t('dataExchange.selectNone')}</Button>
          </div>
          <div className="grid gap-1 sm:grid-cols-2">
            {columns.map((c) => (
              <label key={c.id} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-neutral-50">
                <input type="checkbox" className="size-4 accent-petrol-800" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                {c.header}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">{t('dataExchange.format')}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <Choice name="format" checked={format === 'xlsx'} onChange={() => setFormat('xlsx')}>{t('dataExchange.xlsx')}</Choice>
            <Choice name="format" checked={format === 'csv'} onChange={() => setFormat('csv')}>{t('dataExchange.csv')}</Choice>
          </div>
        </fieldset>
        {state === 'failed' && <Alert>{t('dataExchange.exportFailed')}</Alert>}
        <div className="flex gap-3">
          <Button onClick={() => void run()} disabled={state === 'busy' || chosen.length === 0 || (scope === 'page' ? pageRows.length === 0 : total === 0)}>
            {state === 'busy' ? t('dataExchange.exporting') : t('dataExchange.exportNow')}
          </Button>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>{t('actions.cancel')}</Button>
        </div>
      </div>
    </Dialog>
  );
}
