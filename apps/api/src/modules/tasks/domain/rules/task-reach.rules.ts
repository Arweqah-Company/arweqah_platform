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
  return reachesBeyondReports(scope, viewer, person);
}

/** What the scope reaches besides the viewer and their direct reports: nothing for `unit`, the company, or the units the scope covers (all below, or so many levels). */
function reachesBeyondReports(scope: PermissionScope, viewer: TaskViewer, person: Pick<TaskPerson, 'orgNodeId' | 'companyId'>): boolean {
  if (scope === 'unit') return false;
  if (scope === 'company') return !!viewer.companyId && person.companyId === viewer.companyId;
  if (!person.orgNodeId || !(viewer.reachNodes?.[scope] ?? viewer.subtreeNodeIds).includes(person.orgNodeId)) return false;
  return !viewer.restrictedNodeIds?.includes(person.orgNodeId) || sameCompany(viewer, person);
}

/** In a unit managed per company only the viewer's own company is reached. */
const sameCompany = (viewer: TaskViewer, person: Pick<TaskPerson, 'companyId'>): boolean => !!viewer.companyId && person.companyId === viewer.companyId;

export const isDirectReport = (viewer: TaskViewer, person: Pick<TaskPerson, 'managerEmployeeId'>): boolean =>
  !!viewer.employeeId && person.managerEmployeeId === viewer.employeeId;
