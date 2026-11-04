import { Download, RefreshCw, Upload } from 'lucide-react';
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
  /** A second way to bring data in: update the records the file names (the list says what it does in the dialog's title). */
  updating?: ImportProps;
  /** The permission keys of the two buttons: a button shows only for people who hold its key. */
  permissions: { export: string; import?: string };
}

const BUTTON = 'gap-2 border-neutral-200 text-fg';

export function ExchangeButtons<T>({ exporting, importing, updating, permissions }: Props<T>) {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const allowed = !permissions.import || can(permissions.import);
  const [open, setOpen] = useState<'export' | 'import' | 'update' | null>(null);
  const close = (o: boolean) => !o && setOpen(null);
  const dialogs = { import: importing, update: updating };
  const bringIn = [
    { id: 'import' as const, icon: Upload, label: t('dataExchange.import'), config: importing },
    { id: 'update' as const, icon: RefreshCw, label: t('dataExchange.update'), config: updating },
  ].filter((b) => b.config && allowed);
  const chosen = open === 'import' || open === 'update' ? dialogs[open] : undefined;
  return (
    <>
      {bringIn.map(({ id, icon: Icon, label }) => <Button key={id} variant="secondary" className={BUTTON} onClick={() => setOpen(id)}><Icon className="size-4" aria-hidden />{label}</Button>)}
      {can(permissions.export) && <Button variant="secondary" className={BUTTON} onClick={() => setOpen('export')}><Download className="size-4" aria-hidden />{t('dataExchange.export')}</Button>}
      {open === 'export' && <ExportDialog {...exporting} open onOpenChange={close} />}
      {allowed && chosen && <ImportDialog {...chosen} open onOpenChange={close} />}
    </>
  );
}
