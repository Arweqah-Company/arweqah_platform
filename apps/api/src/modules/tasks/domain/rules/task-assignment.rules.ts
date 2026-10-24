/** What the assignment rules need to know about creator and assignee. */
export interface AssignmentFacts {
  creatorUserId: string;
  assigneeUserId: string;
  /** The assignee is inside the reach of the creator's `tasks.assign` key. */
  inAssignReach: boolean;
  /** The assignee is the manager of the creator's department. */
  isCreatorsDepartmentManager: boolean;
  /** Creator and assignee work on the same ticket. */
  shareTicket: boolean;
  /** The assignee belongs to the project the task is for (the projects module is not built yet, so this is false). */
  isProjectMember: boolean;
}

export type AssignmentDecision = { allowed: boolean; selfAssigned: boolean };

/**
 * Who may give a task to whom: a manager to anyone in their reach; an employee to the manager of their department;
 * people on the same ticket to each other; project members (later); and anybody to themselves, which waits for approval.
 */
export function decideAssignment(f: AssignmentFacts): AssignmentDecision {
  if (f.creatorUserId === f.assigneeUserId) return { allowed: true, selfAssigned: true };
  const allowed = f.inAssignReach || f.isCreatorsDepartmentManager || f.shareTicket || f.isProjectMember;
  return { allowed, selfAssigned: false };
}
