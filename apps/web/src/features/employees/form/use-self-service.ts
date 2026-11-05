import { CorePermission } from '@arweqah-platform/shared';
import { useReach } from '@/core/permissions/use-access';

/** May the person open this employee's edit form? Needs the key, and for a plain employee ("edit employees" reaches only their own record) only their own record. */
export function useCanEditEmployee(): (isOwn: boolean) => boolean {
  const reach = useReach(CorePermission.EmployeesUpdate);
  return (isOwn) => !!reach && (isOwn || reach !== 'own');
}
