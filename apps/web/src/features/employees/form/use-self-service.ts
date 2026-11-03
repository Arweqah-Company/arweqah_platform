import { CorePermission } from '@arweqah-platform/shared';
import { useMe } from '@/core/auth/session';
import { useReach } from '@/core/permissions/use-access';

/** May the person open this employee's edit form? Needs the key, and for a plain employee ("edit employees" reaches only their own record) only their own record. */
export function useCanEditEmployee(): (isOwn: boolean) => boolean {
  const reach = useReach(CorePermission.EmployeesUpdate);
  return (isOwn) => !!reach && (isOwn || reach !== 'own');
}

/** Editing one's own record while "edit employees" reaches only one's own records (a plain employee): the HR fields of the form are locked. */
export function useIsSelfService(employee: { userId: string } | undefined): boolean {
  const me = useMe().data;
  const reach = useReach(CorePermission.EmployeesUpdate);
  return !!employee && !!me && employee.userId === me.id && reach === 'own';
}
