import type { PermissionScope } from '@arweqah-platform/shared';
import type { TaskPerson, TaskViewer } from '../types/task.types';

/**
 * Is `person` inside what a scope reaches for `viewer`?
 *  - own: the viewer alone;
 *  - unit: their direct reports (the people whose manager they are);
 *  - subtree: their direct reports and everyone in their unit and the units below;
 *  - company: everyone of their company; all: everyone.
 * A viewer who does not hold the key (null scope) reaches nobody, not even themselves.
 */
export function inReach(scope: PermissionScope | null, viewer: TaskViewer, person: Pick<TaskPerson, 'userId' | 'managerEmployeeId' | 'orgNodeId' | 'companyId'>): boolean {
  if (!scope) return false;
  if (scope === 'all') return true;
  if (person.userId === viewer.userId) return true;
  if (scope === 'own') return false;
  if (isDirectReport(viewer, person)) return true;
  if (scope === 'unit') return false;
  if (scope === 'company') return !!viewer.companyId && person.companyId === viewer.companyId;
  return !!person.orgNodeId && viewer.subtreeNodeIds.includes(person.orgNodeId);
}

export const isDirectReport = (viewer: TaskViewer, person: Pick<TaskPerson, 'managerEmployeeId'>): boolean =>
  !!viewer.employeeId && person.managerEmployeeId === viewer.employeeId;
