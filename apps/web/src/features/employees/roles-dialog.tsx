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

/** Replaces the employee's roles (the automatic roles the person holds are shown ticked and can be taken off). The server refuses roles that grant more than the person assigning them holds. */
export function RolesDialog({ employee, open, onOpenChange }: Props) {
  const { t, i18n } = useTranslation('employees');
  const roles = useRoles();
  const assign = useAssignRoles(employee.id);
  const held = new Set(employee.roles.map((r) => r.id));
  const options = (roles.data ?? []).filter((r) => !r.autoRule || held.has(r.id) || (r.autoRule === 'node_head' && r.origin?.companyId === employee.company.id)).map((r) => ({ id: r.id, label: i18n.language === 'en' ? r.nameEn : r.nameAr }));
  return <PickDialog title={t('rolesDialog.title')} description={t('rolesDialog.description')} options={options} initial={employee.roles.map((r) => r.id)} save={(ids) => assign.mutateAsync({ roleIds: ids })} savedText={t('rolesSaved')} open={open} onOpenChange={onOpenChange} />;
}
