import { CorePermission } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useMe } from '@/core/auth/session';
import { usePermissions } from '@/core/permissions/can';
import { Tabs } from '@/shared/ui';

export type EmployeesTab = 'list' | 'team';

/** What «My team» holds: the unit's colleagues (`directory.view`) and their career path (`career_team.view`); each can be hidden from a role by page visibility. */
export function useTeamParts(): { colleagues: boolean; career: boolean } {
  const { can } = usePermissions();
  const hidden = useMe().data?.hiddenPages ?? [];
  return { colleagues: can(CorePermission.DirectoryView) && !hidden.includes('directory'), career: can(CorePermission.CareerTeamView) && !hidden.includes('career-team') };
}

/** The tabs of the Employees page the person may open: «Employees» with `employees.view`, «My team» when they may see the colleagues or their career path. The choice lives in the address (`?tab=team`). */
export function useEmployeesTab() {
  const parts = useTeamParts();
  const { can } = usePermissions();
  const [params, setParams] = useSearchParams();
  const available: EmployeesTab[] = [...(can(CorePermission.EmployeesView) ? (['list'] as const) : []), ...(parts.colleagues || parts.career ? (['team'] as const) : [])];
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
