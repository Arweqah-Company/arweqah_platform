import { Download, Upload } from 'lucide-react';
import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui';
import { ExportDialog } from './export-dialog';
import { ImportDialog } from './import-dialog';

type ImportProps = Omit<ComponentProps<typeof ImportDialog>, 'open' | 'onOpenChange'>;

/** The "Import" and "Export" buttons of a list's toolbar with their dialogs; import is offered only for lists that can be filled in from a file. */
export function ExchangeButtons<T>({ exporting, importing }: { exporting: Omit<ComponentProps<typeof ExportDialog<T>>, 'open' | 'onOpenChange'>; importing?: ImportProps }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<'export' | 'import' | null>(null);
  return (
    <>
      {importing && <Button variant="secondary" className="gap-2 border-neutral-200 text-ink" onClick={() => setOpen('import')}><Upload className="size-4" aria-hidden />{t('dataExchange.import')}</Button>}
      <Button variant="secondary" className="gap-2 border-neutral-200 text-ink" onClick={() => setOpen('export')}><Download className="size-4" aria-hidden />{t('dataExchange.export')}</Button>
      {open === 'export' && <ExportDialog {...exporting} open onOpenChange={(o) => !o && setOpen(null)} />}
      {importing && open === 'import' && <ImportDialog {...importing} open onOpenChange={(o) => !o && setOpen(null)} />}
    </>
  );
}
