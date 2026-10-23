import { Download, Upload } from 'lucide-react';
import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/core/permissions/can';
import { Button } from '@/shared/ui';
import { ExportDialog } from './export-dialog';
import { ImportDialog } from './import-dialog';

type ImportProps = Omit<ComponentProps<typeof ImportDialog>, 'open' | 'onOpenChange'>;

/** The "Import" and "Export" buttons of a list's toolbar with their dialogs; import is offered only for lists that can be filled in from a file. */
interface Props<T> {
  exporting: Omit<ComponentProps<typeof ExportDialog<T>>, 'open' | 'onOpenChange'>;
  importing?: ImportProps;
  /** The permission keys of the two buttons: a button shows only for people who hold its key. */
  permissions: { export: string; import?: string };
}

export function ExchangeButtons<T>({ exporting, importing, permissions }: Props<T>) {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const mayImport = !!importing && (!permissions.import || can(permissions.import));
  const [open, setOpen] = useState<'export' | 'import' | null>(null);
  return (
    <>
      {mayImport && <Button variant="secondary" className="gap-2 border-neutral-200 text-fg" onClick={() => setOpen('import')}><Upload className="size-4" aria-hidden />{t('dataExchange.import')}</Button>}
      {can(permissions.export) && <Button variant="secondary" className="gap-2 border-neutral-200 text-fg" onClick={() => setOpen('export')}><Download className="size-4" aria-hidden />{t('dataExchange.export')}</Button>}
      {open === 'export' && <ExportDialog {...exporting} open onOpenChange={(o) => !o && setOpen(null)} />}
      {mayImport && open === 'import' && <ImportDialog {...importing} open onOpenChange={(o) => !o && setOpen(null)} />}
    </>
  );
}
