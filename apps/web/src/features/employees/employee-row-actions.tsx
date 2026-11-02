import { CorePermission as P, type EmployeeListItemDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useCanEditEmployee } from './form/use-self-service';
import { Can } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Eye, Pencil, Power, PowerOff } from 'lucide-react';
import { ConfirmDialog, RowAction } from '@/shared/ui';
import { useSetActive } from './api';

/** Every action on an employee row: open, edit, and (de)activate; the rest (roles, groups, end of contract) are on the employee's page. */
export function EmployeeRowActions({ employee: e }: { employee: EmployeeListItemDto }) {
  const { t } = useTranslation('employees');
  const { t: tc } = useTranslation();
  const canEdit = useCanEditEmployee();
  const setActive = useSetActive(e.id);
  const [asking, setAsking] = useState(false);
  const run = async (active: boolean) => {
    try {
      await setActive.mutateAsync(active);
      toast.success(t(active ? 'activated' : 'deactivated'));
    } catch (error) {
      toast.error(errorMessage(tc, error));
    } finally {
      setAsking(false);
    }
  };
  return (
    <>
      <RowAction label={tc('actions.view')} icon={Eye} to={`/employees/${e.id}`} />
      {canEdit(e.isOwn) && <RowAction label={tc('actions.edit')} icon={Pencil} to={`/employees/${e.id}/edit`} />}
      <Can permission={P.EmployeesDeactivate}>
        {e.isActive ? (
          <RowAction label={t('actions.deactivate')} icon={PowerOff} danger onClick={() => setAsking(true)} />
        ) : (
          <RowAction label={t('actions.activate')} icon={Power} disabled={setActive.isPending} onClick={() => void run(true)} />
        )}
      </Can>
      <ConfirmDialog open={asking} onOpenChange={setAsking} tone="danger" title={t('deactivateDialog.title')} description={t('deactivateDialog.description')} confirmLabel={t('actions.deactivate')} onConfirm={() => run(false)} />
    </>
  );
}
