import { Injectable } from '@nestjs/common';
import { COMMENT_ACTION_KEYS, CorePermission, type CommentAction, type CommentRelation, type CommentRuleMatrix } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { TaskCommentRepository } from '../../domain/contracts/task-comment.repository';
import { TaskRepository } from '../../domain/contracts/task.repository';
import { TaskNotFoundError } from '../../domain/errors/task.errors';
import { commentRelations, isConversationClosed, isOutsider, mayDo } from '../../domain/rules/task-comment-access.rules';
import type { PolicyRecord, TaskRow, TaskViewer } from '../../domain/types/task.types';
import { TaskPolicyService } from '../services/task-policy.service';
import { TaskAccessPolicy } from './task-access.policy';

/** Who a person is in one task's conversation, and what the key, the matrix and the task's state let them do there. */
export interface CommentContext {
  viewer: TaskViewer;
  task: TaskRow;
  relations: CommentRelation[];
  isOutsider: boolean;
  matrix: CommentRuleMatrix;
  policy: PolicyRecord;
  closed: boolean;
  now: Date;
  /** The key and a matrix cell, ignoring whether the conversation is closed. */
  may(action: CommentAction): boolean;
  holds(key: string): boolean;
}

@Injectable()
export class TaskCommentAccessPolicy {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly comments: TaskCommentRepository,
    private readonly access: TaskAccessPolicy,
    private readonly policies: TaskPolicyService,
    private readonly clock: Clock,
  ) {}

  /** The viewer's place in the conversation of a task; anybody who may not read it gets "not found", never "forbidden". */
  async open(viewer: TaskViewer, taskId: string): Promise<CommentContext> {
    const task = await this.tasks.find(taskId, viewer.userId);
    if (!task) throw new TaskNotFoundError();
    const holds = (key: string): boolean => viewer.scopes[key] != null;
    const [relations, matrix, policy] = await Promise.all([this.relationsOf(viewer, task), this.comments.rules(task.companyId), this.policies.forCompany(task.companyId)]);
    const now = this.clock.now();
    const may = (action: CommentAction): boolean => mayDo({ action, relations, holdsKey: holds, matrix });
    if (!may('read')) throw new TaskNotFoundError();
    const closed = isConversationClosed({ archived: task.archivedAt !== null, completedAt: task.completedAt, lockDays: policy.commentLockDays, now });
    return { viewer, task, relations, isOutsider: isOutsider(relations), matrix, policy, closed, now, may, holds };
  }

  /** The key of an action, for messages and checks that name it. */
  keyOf(action: CommentAction): string {
    return COMMENT_ACTION_KEYS[action];
  }

  holdsDeleteAny(ctx: Pick<CommentContext, 'holds'>): boolean {
    return ctx.holds(CorePermission.TasksCommentDeleteAny);
  }

  private async relationsOf(viewer: TaskViewer, task: TaskRow): Promise<CommentRelation[]> {
    const [isCategoryPeer, isMentioned] = await Promise.all([
      task.tagId ? this.comments.hasOpenTaskInCategory(viewer.userId, task.tagId) : Promise.resolve(false),
      this.comments.isMentioned(task.id, viewer.userId),
    ]);
    return commentRelations({
      userId: viewer.userId,
      assigneeUserId: task.assigneeUserId,
      creatorUserId: task.creatorUserId,
      approverUserId: task.approverUserId,
      reviewerUserId: task.reviewerUserId,
      isFollowing: task.isFollowing,
      isTeamManager: this.access.relationsOf(viewer, task).includes('team'),
      isCategoryPeer,
      isMentioned,
    });
  }
}
