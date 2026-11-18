import { Injectable } from '@nestjs/common';
import type { AddTaskFollowersInput, TaskFollowerDto } from '@arweqah-platform/shared';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { ForbiddenError } from '../../../../common/domain/domain-error';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { TaskDirectory } from '../../domain/contracts/task-directory.port';
import { TaskRepository } from '../../domain/contracts/task.repository';
import { TaskFollowerInvalidError } from '../../domain/errors/task.errors';
import type { TaskRow, TaskViewer } from '../../domain/types/task.types';
import { TASK_AUDIT } from '../messages/task.messages';
import { TaskAccessPolicy } from '../policies/task-access.policy';
import { TaskNotifier } from './task-notifier.service';

/**
 * Followers chosen by others (FR-163): the assignee, the giver of the task or a manager whose `tasks.followers_manage` reaches the assignee adds active employees of the
 * same company and removes them. A follower sees the task and may stop following by themselves (the existing «unfollow»). Whoever cannot manage gets 403 on a task they see, 404 on one they do not.
 */
@Injectable()
export class TaskFollowersService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly access: TaskAccessPolicy,
    private readonly directory: TaskDirectory,
    private readonly notifier: TaskNotifier,
    private readonly tx: TransactionRunner,
    private readonly events: EventEmitter2,
  ) {}

  async list(viewer: TaskViewer, id: string): Promise<TaskFollowerDto[]> {
    await this.managed(viewer, id);
    return this.tasks.followers(id);
  }

  /** People to choose from: active employees of the viewer's company matching the search, never the assignee nor someone who already follows. */
  async candidates(viewer: TaskViewer, id: string, search?: string): Promise<TaskFollowerDto[]> {
    const task = await this.managed(viewer, id);
    const taken = new Set([task.assigneeUserId, ...(await this.tasks.followerIds(id))]);
    const found = await this.directory.mentionables(task.assigneeCompanyId ?? viewer.companyId ?? '', search);
    return found.filter((p) => !taken.has(p.userId)).map((p) => ({ userId: p.userId, name: p.name }));
  }

  async add(viewer: TaskViewer, id: string, input: AddTaskFollowersInput): Promise<TaskFollowerDto[]> {
    const task = await this.managed(viewer, id);
    const ids = [...new Set(input.userIds)].filter((u) => u !== task.assigneeUserId);
    const people = await this.directory.people(ids);
    if (ids.some((u) => !people.has(u) || people.get(u)?.companyId !== (task.assigneeCompanyId ?? viewer.companyId))) throw new TaskFollowerInvalidError();
    const added = await this.tx.run(async (tx) => {
      const fresh = await this.tasks.addFollowers(id, ids, tx);
      await this.notifier.send({ kind: 'followerAdded', task, recipients: fresh, actorUserId: viewer.userId, tx });
      return fresh;
    });
    if (added.length) this.audit(viewer, TASK_AUDIT.followersAdded, id, { count: added.length });
    return this.tasks.followers(id);
  }

  async remove(viewer: TaskViewer, id: string, userId: string): Promise<TaskFollowerDto[]> {
    await this.managed(viewer, id);
    await this.tx.run((tx) => this.tasks.unfollow(id, userId, tx));
    this.audit(viewer, TASK_AUDIT.followerRemoved, id, {});
    return this.tasks.followers(id);
  }

  private async managed(viewer: TaskViewer, id: string): Promise<TaskRow> {
    const task = await this.tasks.find(id, viewer.userId);
    this.access.assertCanView(viewer, task);
    if (!this.access.mayManageFollowers(viewer, task as TaskRow) || (task as TaskRow).archivedAt !== null) throw new ForbiddenError();
    return task as TaskRow;
  }

  private audit(viewer: TaskViewer, action: string, id: string, changes: Record<string, unknown>): void {
    const event: AuditEvent = { actorId: viewer.userId, action, entityType: 'task', entityId: id, changes };
    this.events.emit(AUDIT_EVENT, event);
  }
}
