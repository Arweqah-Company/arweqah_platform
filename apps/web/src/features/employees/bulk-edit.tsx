import { BULK_UPDATE_MAX, CorePermission, type EmployeeListItemDto } from '@arweqah-platform/shared';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { usePermissions } from '@/core/permissions/can';
import { Button, type TableSelection } from '@/shared/ui';
import { BulkDialog } from './bulk-dialog';

/**
 * Row selection and the bulk edit for the employee list (FR-93): the table's `selection` (only for who holds the key), and the bar above the table
 * («N selected», the action, clear) with the dialog it opens. Up to 500 employees can be chosen across pages.
 */
export function useBulkEdit(items: EmployeeListItemDto[] | undefined): { selection: TableSelection | undefined; panel: ReactNode } {
  const { t } = useTranslation('employees');
  const enabled = usePermissions().can(CorePermission.EmployeesBulkUpdate);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  if (!enabled) return { selection: undefined, panel: null };
  const choose = (next: Set<string>) => (next.size > BULK_UPDATE_MAX ? toast.error(t('bulk.tooMany', { max: BULK_UPDATE_MAX })) : setSelected(next));
  const panel = (
    <>
      {selected.size > 0 && (
        <div role="region" aria-label={t('bulk.button')} data-tour="bulk-bar" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-link bg-petrol-50 px-4 py-3 text-sm">
          <span className="font-medium">{t('bulk.selected', { count: selected.size })}</span>
          <span className="flex gap-2">
            <Button size="sm" onClick={() => setOpen(true)}>{t('bulk.button')}</Button>
            <Button size="sm" variant="secondary" onClick={() => setSelected(new Set())}>{t('bulk.clear')}</Button>
          </span>
        </div>
      )}
      {open && <BulkDialog employeeIds={[...selected]} companyId={items?.find((e) => selected.has(e.id))?.company.id} onClose={() => setOpen(false)} onDone={() => { setOpen(false); setSelected(new Set()); }} />}
    </>
  );
  return { selection: { selected, onChange: choose }, panel };
}
