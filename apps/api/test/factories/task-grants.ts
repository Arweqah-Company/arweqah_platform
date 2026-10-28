import { CorePermission as P, type PermissionGrant, type PermissionScope } from '@arweqah-platform/shared';

const grant = (keys: string[], scope: PermissionScope): PermissionGrant[] => keys.map((key) => ({ key, scope }));

/** What a person needs to work with their own tasks (the Employee role does not hold these until an administrator gives them). */
export const TASK_EMPLOYEE_GRANTS: PermissionGrant[] = [
  ...grant([P.TasksView, P.TasksChangeStatus], 'own'),
  ...grant([P.TasksCreate, P.TasksReview, P.TasksResubmit, P.TasksObject, P.TasksFollow, P.TasksLogTime, P.TasksReopen, P.TasksUpdate, P.TasksArchiveView, P.TasksRestore, P.TasksMatrixView], 'own'),
];

/** A manager: everything of an employee, plus the team keys at the given reach. */
export const taskManagerGrants = (scope: PermissionScope = 'subtree'): PermissionGrant[] => [
  ...TASK_EMPLOYEE_GRANTS.filter((g) => ![P.TasksUpdate, P.TasksReopen, P.TasksMatrixView, P.TasksArchiveView, P.TasksRestore].includes(g.key as never)),
  ...grant([P.TasksTeamView, P.TasksAssign, P.TasksTeamChangeStatus, P.TasksApprove, P.TasksReject, P.TasksUpdate, P.TasksReopen, P.TasksMatrixView, P.TasksArchiveView, P.TasksRestore], scope),
];

/** The page key `tasks.view` alone: somebody who may open the page but nothing else. */
export const TASK_VIEW_ONLY: PermissionGrant[] = grant([P.TasksView], 'own');

/** The comment keys of the conversation (the matrix of the company then says for which relations they work). */
export const TASK_COMMENT_KEYS = [P.TasksCommentView, P.TasksCommentAdd, P.TasksCommentReply, P.TasksCommentUpload, P.TasksCommentMention, P.TasksCommentEdit, P.TasksCommentDelete];

export const TASK_COMMENT_GRANTS: PermissionGrant[] = grant(TASK_COMMENT_KEYS, 'all');

/** The comment grants of an employee who also works with tasks. */
export const TASK_COMMENTER_GRANTS: PermissionGrant[] = [...TASK_EMPLOYEE_GRANTS, ...TASK_COMMENT_GRANTS];
