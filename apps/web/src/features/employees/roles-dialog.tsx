import type { EmployeeDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useRoles } from '@/features/roles';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Dialog } from '@/shared/ui';
import { useAssignRoles } from './api';

interface Props {
  employee: EmployeeDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Replaces the employee's roles. The server refuses roles that grant more than the person assigning them holds. */
export function RolesDialog({ employee, open, onOpenChange }: Props) {
  const { t, i18n } = useTranslation('employees');
  const { t: tc } = useTranslation();
  const roles = useRoles();
  const assign = useAssignRoles(employee.id);
  const [selected, setSelected] = useState(() => employee.roles.map((r) => r.id));

  const save = async () => {
    try {
      await assign.mutateAsync(selected);
      toast.success(t('rolesSaved'));
      onOpenChange(false);
    } catch {
      /* shown inside the dialog */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('rolesDialog.title')} description={t('rolesDialog.description')}>
      <div className="flex flex-col gap-4">
        {assign.isError && <Alert>{errorMessage(tc, assign.error)}</Alert>}
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">{t('rolesDialog.title')}</legend>
          {(roles.data ?? []).filter((r) => !r.autoRule).map((role) => (
            <label key={role.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-petrol-800"
                checked={selected.includes(role.id)}
                onChange={(e) => setSelected(e.target.checked ? [...selected, role.id] : selected.filter((id) => id !== role.id))}
              />
              {i18n.language === 'en' ? role.nameEn : role.nameAr}
            </label>
          ))}
        </fieldset>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>{tc('actions.cancel')}</Button>
          <Button disabled={assign.isPending} onClick={() => void save()}>{tc('actions.save')}</Button>
        </div>
      </div>
    </Dialog>
  );
}
