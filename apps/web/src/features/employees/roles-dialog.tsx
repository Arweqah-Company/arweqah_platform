import type { EmployeeDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { useRoles } from '@/features/roles';
import { useAssignRoles } from './api';
import { PickDialog } from './pick-dialog';

interface Props {
  employee: EmployeeDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Replaces the employee's roles (the automatic ones are kept by the system). The server refuses roles that grant more than the person assigning them holds. */
export function RolesDialog({ employee, open, onOpenChange }: Props) {
  const { t, i18n } = useTranslation('employees');
  const roles = useRoles();
  const assign = useAssignRoles(employee.id);
  const options = (roles.data ?? []).filter((r) => !r.autoRule).map((r) => ({ id: r.id, label: i18n.language === 'en' ? r.nameEn : r.nameAr }));
  return <PickDialog title={t('rolesDialog.title')} description={t('rolesDialog.description')} options={options} initial={employee.roles.map((r) => r.id)} save={(ids) => assign.mutateAsync(ids)} savedText={t('rolesSaved')} open={open} onOpenChange={onOpenChange} />;
}
