import type { EmployeeDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { useGrantableRoles } from '@/features/roles';
import { useAssignRoles } from './api';
import { PickDialog } from './pick-dialog';

interface Props {
  employee: EmployeeDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Replaces the employee's roles. The list is the roles the person assigning may give (a leader sees the roles they hold, without the roles page); the roles the employee already has are always shown. The server refuses roles that grant more than the person assigning them holds. */
export function RolesDialog({ employee, open, onOpenChange }: Props) {
  const { t, i18n } = useTranslation('employees');
  const roles = useGrantableRoles();
  const assign = useAssignRoles(employee.id);
  const held = new Set(employee.roles.map((r) => r.id));
  const name = (r: { nameAr: string; nameEn: string }) => (i18n.language === 'en' ? r.nameEn : r.nameAr);
  const offered = (roles.data ?? []).filter((r) => !r.autoRule || held.has(r.id) || (r.autoRule === 'node_head' && r.origin?.companyId === employee.company.id));
  const options = [...new Map([...offered, ...employee.roles].map((r) => [r.id, { id: r.id, label: name(r) }])).values()];
  return <PickDialog title={t('rolesDialog.title')} description={t('rolesDialog.description')} options={options} initial={employee.roles.map((r) => r.id)} save={(ids) => assign.mutateAsync({ roleIds: ids })} savedText={t('rolesSaved')} open={open} onOpenChange={onOpenChange} />;
}
