import { CorePermission } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useMe } from '@/core/auth/session';
import { usePermissions } from '@/core/permissions/can';
import { Tabs } from '@/shared/ui';

export type EmployeesTab = 'list' | 'team';

/** The tabs of the Employees page the person may open: «Employees» with `employees.view`, «My team» with `directory.view` unless an administrator hid that page from their role. The choice lives in the address (`?tab=team`). */
export function useEmployeesTab() {
  const { can } = usePermissions();
  const hidden = useMe().data?.hiddenPages ?? [];
  const [params, setParams] = useSearchParams();
  const available: EmployeesTab[] = [...(can(CorePermission.EmployeesView) ? (['list'] as const) : []), ...(can(CorePermission.DirectoryView) && !hidden.includes('directory') ? (['team'] as const) : [])];
  const wanted: EmployeesTab = params.get('tab') === 'team' ? 'team' : 'list';
  const tab = available.includes(wanted) ? wanted : (available[0] ?? 'list');
  return { tab, available, select: (id: EmployeesTab) => setParams(id === 'team' ? { tab: 'team' } : {}, { replace: true }) };
}

/** The tab row; nothing is drawn when there is only one tab to open. */
export function EmployeesTabs({ tab, available, select }: ReturnType<typeof useEmployeesTab>) {
  const { t } = useTranslation('employees');
  if (available.length < 2) return null;
  return <Tabs label={t('pageTabs.label')} value={tab} tabs={available.map((id) => ({ id, label: t(`pageTabs.${id}`) }))} onChange={select} />;
}
