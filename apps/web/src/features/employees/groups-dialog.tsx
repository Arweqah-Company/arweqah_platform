import type { EmployeeDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { useAssignGroups, useRoleGroupOptions } from './api';
import { PickDialog } from './pick-dialog';

interface Props {
  employee: EmployeeDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Gives the employee groups of roles: each group gives them every role inside it. */
export function GroupsDialog({ employee, open, onOpenChange }: Props) {
  const { t, i18n } = useTranslation('employees');
  const groups = useRoleGroupOptions();
  const assign = useAssignGroups(employee.id);
  const options = (groups.data ?? []).map((g) => ({ id: g.id, label: i18n.language === 'en' ? g.nameEn : g.nameAr }));
  return <PickDialog title={t('groupsDialog.title')} description={t('groupsDialog.description')} options={options} initial={employee.groups.map((g) => g.id)} save={(ids) => assign.mutateAsync(ids)} savedText={t('groupsSaved')} open={open} onOpenChange={onOpenChange} />;
}
