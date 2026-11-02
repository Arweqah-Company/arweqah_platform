import { CorePermission } from '@arweqah-platform/shared';
import { useMe } from '@/core/auth/session';

/** Does "edit employees" reach only the person's own record (a plain employee)? */
function reachesOnlyOwn(permissions: { key: string; scope: string }[]): boolean {
  const reach = permissions.filter((p) => p.key === CorePermission.EmployeesUpdate);
  return reach.length > 0 && reach.every((p) => p.scope === 'own');
}

/** May the person open this employee's edit form? Needs the key, and for a plain employee only their own record. */
export function useCanEditEmployee(): (isOwn: boolean) => boolean {
  const me = useMe().data;
  const permissions = me?.permissions ?? [];
  return (isOwn) => permissions.some((p) => p.key === CorePermission.EmployeesUpdate) && (isOwn || !reachesOnlyOwn(permissions));
}

/** Editing one's own record while "edit employees" reaches only one's own records (a plain employee): the HR fields of the form are locked. */
export function useIsSelfService(employee: { userId: string } | undefined): boolean {
  const me = useMe().data;
  if (!employee || !me || employee.userId !== me.id) return false;
  return reachesOnlyOwn(me.permissions);
}
