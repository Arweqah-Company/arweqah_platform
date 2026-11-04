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
  /** The permission keys of the buttons: a button shows only for people who hold its key (`update` is the key of the update-from-a-file button; without it, `import` guards both). */
  permissions: { export: string; import?: string; update?: string };
}

const BUTTON = 'gap-2 border-neutral-200 text-fg';

/** Which of the two ways to bring data in the person may use: each has its own key (the update button falls back to the import key). */
function useBringInAllowed(permissions: Props<unknown>['permissions']): Record<'import' | 'update', boolean> {
  const { can } = usePermissions();
  const holds = (key: string | undefined) => !key || can(key);
  return { import: holds(permissions.import), update: holds(permissions.update ?? permissions.import) };
}

export function ExchangeButtons<T>({ exporting, importing, updating, permissions }: Props<T>) {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const allowedBy = useBringInAllowed(permissions);
  const [open, setOpen] = useState<'export' | 'import' | 'update' | null>(null);
  const close = (o: boolean) => !o && setOpen(null);
  const dialogs = { import: importing, update: updating };
  const bringIn = [
    { id: 'import' as const, icon: Upload, label: t('dataExchange.import'), config: importing },
    { id: 'update' as const, icon: RefreshCw, label: t('dataExchange.update'), config: updating },
  ].filter((b) => b.config && allowedBy[b.id]);
  const chosen = open === 'import' || open === 'update' ? dialogs[open] : undefined;
  return (
    <>
      {bringIn.map(({ id, icon: Icon, label }) => <Button key={id} variant="secondary" className={BUTTON} onClick={() => setOpen(id)}><Icon className="size-4" aria-hidden />{label}</Button>)}
      {can(permissions.export) && <Button variant="secondary" className={BUTTON} onClick={() => setOpen('export')}><Download className="size-4" aria-hidden />{t('dataExchange.export')}</Button>}
      {open === 'export' && <ExportDialog {...exporting} open onOpenChange={close} />}
      {open && open !== 'export' && allowedBy[open] && chosen && <ImportDialog {...chosen} open onOpenChange={close} />}
    </>
  );
}
