import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CorePermission as P, riyadhToday, type AnswerObjectionInput, type ObjectTaskInput } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner, type TransactionContext } from '../../../../common/application/transaction-runner';
import { ForbiddenError } from '../../../../common/domain/domain-error';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { JobScheduler } from '../../../../core/messaging/application/outbox';
import { TaskRepository } from '../../domain/contracts/task.repository';
import { TaskObjectionNotAllowedError, TaskObjectionNotFoundError, TaskReassignRequiredError, TaskRevisionConflictError } from '../../domain/errors/task.errors';
import { objectionExpiry } from '../../domain/rules/task-dates.rules';
import { objectionRefusal } from '../../domain/rules/task-objection.rules';
import type { TaskRow, TaskViewer } from '../../domain/types/task.types';
import { TASK_AUDIT, TASK_TOPICS } from '../messages/task.messages';
import { TaskAccessPolicy } from '../policies/task-access.policy';
import { TaskNotifier } from './task-notifier.service';
import { TaskPolicyService } from './task-policy.service';
import { TasksService } from './tasks.service';

const dedupeKey = (objectionId: string): string => `task-objection:${objectionId}`;

/**
 * An objection to a task somebody else gave: raised by the assignee while the task is still to do. Left unanswered it lapses after the
 * policy's working days and the task stays with the assignee; the giver may close it earlier by answering.
 */
@Injectable()
export class TaskObjectionService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly access: TaskAccessPolicy,
    private readonly policies: TaskPolicyService,
    private readonly details: TasksService,
    private readonly notifier: TaskNotifier,
    private readonly scheduler: JobScheduler,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  async object(viewer: TaskViewer, id: string, input: ObjectTaskInput): Promise<void> {
    const task = await this.visible(viewer, id);
    const refusal = objectionRefusal({ isAssignee: task.assigneeUserId === viewer.userId, isCreator: task.creatorUserId === viewer.userId, status: task.status, hasOpenObjection: task.hasOpenObjection, archived: task.archivedAt !== null });
    if (refusal) throw new TaskObjectionNotAllowedError(refusal);
    const policy = await this.policies.forCompany(task.companyId);
    const expiresAt = objectionExpiry(riyadhToday(this.clock.now()), policy.objectionWorkingDays);
    await this.tx.run(async (tx) => {
      const objectionId = await this.tasks.insertObjection({ taskId: id, raisedByUserId: viewer.userId, reason: input.reason, note: input.note ?? null, expiresAt }, tx);
      await this.tasks.appendEvent({ taskId: id, type: 'objected', actorUserId: viewer.userId, note: input.reason }, tx);
      await this.scheduler.schedule(TASK_TOPICS.objectionExpiry, { objectionId, taskId: id }, { runAt: expiresAt, dedupeKey: dedupeKey(objectionId), tx });
      await this.notifier.send({ kind: 'objected', task, recipients: [task.creatorUserId], actorUserId: viewer.userId, tx });
    });
    this.audit(viewer.userId, TASK_AUDIT.objected, id, { reason: input.reason });
  }

  /**
   * Whoever gave the task closes the objection with an answer. Rejecting it leaves the task as it is; accepting it gives the task to
   * somebody else (`newAssigneeUserId`), whom the giver must be allowed to give it to, and who is told.
   */
  async answer(viewer: TaskViewer, id: string, input: AnswerObjectionInput): Promise<void> {
    const task = await this.visible(viewer, id);
    if (task.creatorUserId !== viewer.userId || viewer.scopes[P.TasksUpdate] == null) throw new ForbiddenError();
    const objection = await this.tasks.openObjection(id);
    if (!objection) throw new TaskObjectionNotFoundError();
    const newAssignee = await this.newAssignee(viewer, task, input);
    await this.tx.run(async (tx) => {
      if (!(await this.tasks.answerObjection(objection.id, input.accept ? 'accepted' : 'rejected', viewer.userId, tx))) throw new TaskObjectionNotFoundError();
      await this.tasks.appendEvent({ taskId: id, type: 'objection_answered', actorUserId: viewer.userId, note: input.note ?? null }, tx);
      await this.scheduler.cancel(dedupeKey(objection.id), tx);
      await this.notifier.send({ kind: 'objectionAnswered', task, recipients: [objection.raisedByUserId], actorUserId: viewer.userId, tx });
      if (newAssignee) await this.reassign(task, newAssignee, viewer.userId, tx);
    });
    this.audit(viewer.userId, TASK_AUDIT.objectionAnswered, id, { accepted: input.accept, reassignedTo: newAssignee });
  }

  /** The person an accepted objection hands the task to (null when the objection is rejected). */
  private async newAssignee(viewer: TaskViewer, task: TaskRow, input: AnswerObjectionInput): Promise<string | null> {
    if (!input.accept) return null;
    if (!input.newAssigneeUserId || input.newAssigneeUserId === task.assigneeUserId) throw new TaskReassignRequiredError();
    await this.details.assertMayGiveTo(viewer, input.newAssigneeUserId);
    return input.newAssigneeUserId;
  }

  private async reassign(task: TaskRow, assigneeUserId: string, actorUserId: string, tx: TransactionContext): Promise<void> {
    const patch = { assigneeUserId, lastActivityAt: this.clock.now(), remindedAt: null, overdueNotifiedAt: null };
    if (!(await this.tasks.patch(task.id, task.revision, patch, tx))) throw new TaskRevisionConflictError();
    await this.tasks.appendEvent({ taskId: task.id, type: 'reassigned', actorUserId, note: null }, tx);
    await this.notifier.send({ kind: 'assigned', task, recipients: [assigneeUserId], actorUserId, tx });
  }

  /** Called by the job when an objection's time ends; does nothing if it was answered meanwhile. */
  async expire(objectionId: string, taskId: string): Promise<boolean> {
    const task = await this.tasks.find(taskId, '00000000-0000-0000-0000-000000000000');
    if (!task) return false;
    return this.tx.run(async (tx) => {
      if (!(await this.tasks.answerObjection(objectionId, 'expired', null, tx))) return false;
      await this.tasks.appendEvent({ taskId, type: 'objection_expired', actorUserId: null }, tx);
      await this.notifier.send({ kind: 'objectionExpired', task, recipients: [task.creatorUserId, task.assigneeUserId], tx });
      return true;
    });
  }

  private async visible(viewer: TaskViewer, id: string): Promise<TaskRow> {
    const row = await this.tasks.find(id, viewer.userId);
    this.access.assertCanView(viewer, row);
    return row as TaskRow;
  }

  private audit(actorId: string, action: string, entityId: string, changes: Record<string, unknown>): void {
    const event: AuditEvent = { actorId, action, entityType: 'task', entityId, changes };
    this.events.emit(AUDIT_EVENT, event);
  }
}
