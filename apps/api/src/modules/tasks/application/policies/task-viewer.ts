import { Injectable } from '@nestjs/common';
import { CorePermission, type PermissionScope } from '@arweqah-platform/shared';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { TaskDirectory } from '../../domain/contracts/task-directory.port';
import type { TaskViewer } from '../../domain/types/task.types';

/** The keys whose scope matters when the rules decide who a person reaches or what they may do with a task. */
const SCOPED_KEYS: string[] = [
  CorePermission.TasksView,
  CorePermission.TasksTeamView,
  CorePermission.TasksMatrixView,
  CorePermission.TasksAssign,
  CorePermission.TasksUpdate,
  CorePermission.TasksTeamChangeStatus,
  CorePermission.TasksChangeStatus,
  CorePermission.TasksApprove,
  CorePermission.TasksReject,
  CorePermission.TasksReview,
  CorePermission.TasksReopen,
  CorePermission.TasksResubmit,
  CorePermission.TasksObject,
  CorePermission.TasksFollow,
  CorePermission.TasksLogTime,
  CorePermission.TasksArchiveView,
  CorePermission.TasksRestore,
  CorePermission.TasksCommentView,
  CorePermission.TasksCommentAdd,
  CorePermission.TasksCommentReply,
  CorePermission.TasksCommentUpload,
  CorePermission.TasksCommentMention,
  CorePermission.TasksCommentEdit,
  CorePermission.TasksCommentDelete,
  CorePermission.TasksCommentDeleteAny,
];

/** Builds who is asking: the person, their employee record, and how far each tasks key of theirs reaches. */
@Injectable()
export class TaskViewerFactory {
  constructor(private readonly directory: TaskDirectory) {}

  async of(ctx: AccessContext): Promise<TaskViewer> {
    const scopes: Record<string, PermissionScope | null> = {};
    for (const key of SCOPED_KEYS) scopes[key] = ctx.scopeOf(key);
    const reachNodes = Object.fromEntries(Object.values(scopes).filter((s): s is PermissionScope => !!s && s.startsWith('subtree:')).map((s) => [s, ctx.nodesFor(s)]));
    const restrictedNodeIds = ctx.restrictedNodesFor('subtree');
    return { userId: ctx.userId, employeeId: await this.directory.employeeIdOf(ctx.userId), companyId: ctx.placement.companyId, subtreeNodeIds: ctx.subtreeNodeIds, reachNodes, restrictedNodeIds, scopes };
  }
}
