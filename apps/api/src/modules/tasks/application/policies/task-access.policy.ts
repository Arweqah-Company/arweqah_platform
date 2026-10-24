import { Injectable } from '@nestjs/common';
import { CorePermission as P, type TaskAbilitiesDto } from '@arweqah-platform/shared';
import { TaskNotFoundError } from '../../domain/errors/task.errors';
import { abilitiesOf } from '../../domain/rules/task-abilities.rules';
import { inReach } from '../../domain/rules/task-reach.rules';
import { objectionRefusal } from '../../domain/rules/task-objection.rules';
import type { MoveActor } from '../../domain/rules/task-transitions.rules';
import type { TaskPerson, TaskRow, TaskViewer } from '../../domain/types/task.types';

export type TaskRelation = 'assignee' | 'creator' | 'reviewer' | 'approver' | 'follower' | 'team';

/** The assignee as the reach rules see them. */
export const assigneeOf = (task: TaskRow): Pick<TaskPerson, 'userId' | 'managerEmployeeId' | 'orgNodeId' | 'companyId'> => ({
  userId: task.assigneeUserId,
  managerEmployeeId: task.assigneeManagerEmployeeId,
  orgNodeId: task.assigneeOrgNodeId,
  companyId: task.assigneeCompanyId,
});

const holds = (viewer: TaskViewer, key: string): boolean => viewer.scopes[key] != null;

/**
 * Who sees a task follows the person's relation to it (assignee, creator, reviewer, approver, follower) or their team reach
 * (`tasks.team_view`). An archived task also needs the archive key. Anybody else gets "not found", never "forbidden".
 */
@Injectable()
export class TaskAccessPolicy {
  relationsOf(viewer: TaskViewer, task: TaskRow): TaskRelation[] {
    const relations: TaskRelation[] = [];
    if (task.assigneeUserId === viewer.userId) relations.push('assignee');
    if (task.creatorUserId === viewer.userId) relations.push('creator');
    if (task.reviewerUserId === viewer.userId) relations.push('reviewer');
    if (task.approverUserId === viewer.userId) relations.push('approver');
    if (task.isFollowing) relations.push('follower');
    if (task.assigneeUserId !== viewer.userId && inReach(viewer.scopes[P.TasksTeamView] ?? null, viewer, assigneeOf(task))) relations.push('team');
    return relations;
  }

  /** The relations of someone allowed to see the task; throws 404 for everybody else. */
  assertCanView(viewer: TaskViewer, task: TaskRow | null): TaskRelation[] {
    const relations = task ? this.relationsOf(viewer, task) : [];
    const hidden = !task || relations.length === 0 || (task.archivedAt !== null && !holds(viewer, P.TasksArchiveView));
    if (hidden) throw new TaskNotFoundError();
    return relations;
  }

  /** Does the viewer reach the assignee through the scope of this key (someone else, never themselves)? */
  reaches(viewer: TaskViewer, key: string, task: TaskRow): boolean {
    return task.assigneeUserId !== viewer.userId && inReach(viewer.scopes[key] ?? null, viewer, assigneeOf(task));
  }

  /** Who the viewer is for the table of moves; every role is bound to the key that gives it. */
  moveActor(viewer: TaskViewer, task: TaskRow): MoveActor {
    return {
      isAssignee: task.assigneeUserId === viewer.userId && holds(viewer, P.TasksChangeStatus),
      isReviewer: task.reviewerUserId === viewer.userId && holds(viewer, P.TasksReview),
      isCreator: this.mayReopen(viewer, task),
      isTeamManager: this.reaches(viewer, P.TasksTeamChangeStatus, task),
    };
  }

  /** The giver of a task, or a person whose reopen scope reaches the assignee. */
  private mayReopen(viewer: TaskViewer, task: TaskRow): boolean {
    if (!holds(viewer, P.TasksReopen)) return false;
    return task.creatorUserId === viewer.userId || this.reaches(viewer, P.TasksReopen, task);
  }

  /** Editing: the giver (own scope), or a person whose update scope reaches the assignee. */
  mayUpdate(viewer: TaskViewer, task: TaskRow): boolean {
    if (!holds(viewer, P.TasksUpdate)) return false;
    return task.creatorUserId === viewer.userId || task.assigneeUserId === viewer.userId || this.reaches(viewer, P.TasksUpdate, task);
  }

  /** The approver named on the task, or somebody whose approve scope reaches the assignee. */
  isApprover(viewer: TaskViewer, task: TaskRow, key: string): boolean {
    if (task.approverUserId === viewer.userId) return holds(viewer, key);
    return task.approverUserId !== null && this.reaches(viewer, key, task);
  }

  abilities(viewer: TaskViewer, task: TaskRow): TaskAbilitiesDto {
    const actor = this.moveActor(viewer, task);
    const isCreator = task.creatorUserId === viewer.userId;
    const refusal = objectionRefusal({ isAssignee: task.assigneeUserId === viewer.userId, isCreator, status: task.status, hasOpenObjection: task.hasOpenObjection, archived: task.archivedAt !== null });
    return abilitiesOf({
      status: task.status,
      needsReview: task.needsReview,
      archived: task.archivedAt !== null,
      actor,
      isApprover: this.isApprover(viewer, task, P.TasksApprove),
      isCreator,
      isAssignee: task.assigneeUserId === viewer.userId,
      hasOpenObjection: task.hasOpenObjection,
      mayObject: refusal === null,
      can: {
        update: this.mayUpdate(viewer, task),
        approve: holds(viewer, P.TasksApprove),
        object: holds(viewer, P.TasksObject),
        follow: holds(viewer, P.TasksFollow),
        logTime: holds(viewer, P.TasksLogTime),
        resubmit: holds(viewer, P.TasksResubmit),
        restore: holds(viewer, P.TasksRestore),
        move: actor.isAssignee || actor.isReviewer || actor.isCreator || actor.isTeamManager,
      },
    });
  }
}
