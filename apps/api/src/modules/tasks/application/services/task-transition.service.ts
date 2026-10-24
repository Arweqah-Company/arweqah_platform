import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { riyadhToday, type TaskDto, type TransitionTaskInput } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner, type TransactionContext } from '../../../../common/application/transaction-runner';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { TaskRepository } from '../../domain/contracts/task.repository';
import {
  TaskBackdateTooFarError,
  TaskCompletionDateRequiredError,
  TaskNoteRequiredError,
  TaskRevisionConflictError,
  TaskTransitionNotAllowedError,
} from '../../domain/errors/task.errors';
import { resolveCompletionDate } from '../../domain/rules/task-dates.rules';
import { decideMove, type MoveDecision } from '../../domain/rules/task-transitions.rules';
import type { TaskPatch, TaskRow, TaskViewer } from '../../domain/types/task.types';
import { TASK_AUDIT } from '../messages/task.messages';
import { TaskAccessPolicy } from '../policies/task-access.policy';
import { TaskNotifier } from './task-notifier.service';
import { TaskRecurrenceService } from './task-recurrence.service';
import { TaskPolicyService } from './task-policy.service';
import { TasksService } from './tasks.service';

type Allowed = Extract<MoveDecision, { ok: true }>;

/**
 * The only place a task changes status. The board, the buttons and the team page all come here, and the table of moves
 * (`decideMove`) decides; the browser may refuse a wrong drag for comfort, but it is never the protection.
 */
@Injectable()
export class TaskTransitionService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly access: TaskAccessPolicy,
    private readonly policies: TaskPolicyService,
    private readonly notifier: TaskNotifier,
    private readonly recurrence: TaskRecurrenceService,
    private readonly details: TasksService,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  async transition(viewer: TaskViewer, id: string, input: TransitionTaskInput): Promise<TaskDto> {
    const row = await this.tasks.find(id, viewer.userId);
    this.access.assertCanView(viewer, row);
    const task = row as TaskRow;
    const decision = decideMove({ from: task.status, to: input.to, needsReview: task.needsReview, actor: this.access.moveActor(viewer, task), hasNote: !!input.note });
    if (!decision.ok) throw new TaskTransitionNotAllowedError(task.status, input.to, decision.reason);
    if (decision.needsNote && !input.note) throw new TaskNoteRequiredError();
    const patch = await this.patchFor(task, decision, input);
    await this.tx.run(async (tx) => {
      if (!(await this.tasks.patch(id, input.revision, patch, tx))) throw new TaskRevisionConflictError();
      await this.tasks.appendEvent({ taskId: id, type: 'transitioned', actorUserId: viewer.userId, fromStatus: task.status, toStatus: decision.to, note: input.note ?? null }, tx);
      await this.announce(task, decision, viewer.userId, tx);
      if (decision.finishes) await this.recurrence.spawnNext(task, tx);
    });
    this.audit(viewer.userId, id, { from: task.status, to: decision.to });
    return this.details.get(viewer, id);
  }

  /** The columns a move changes: the status, the clock of movement, and the real day of finishing (cleared when a task is reopened). */
  private async patchFor(task: TaskRow, decision: Allowed, input: TransitionTaskInput): Promise<TaskPatch> {
    const now = this.clock.now();
    const patch: TaskPatch = { status: decision.to, lastActivityAt: now };
    if (decision.reopens) return { ...patch, completedAt: null, completedOn: null };
    if (!decision.finishes) return patch;
    const policy = await this.policies.forCompany(task.companyId);
    const date = resolveCompletionDate({ today: riyadhToday(now), dueDate: task.dueDate, completedOn: input.completedOn, backdateDays: policy.backdateDays });
    if (!date.ok) throw this.dateError(date.reason, policy.backdateDays);
    return { ...patch, completedAt: now, completedOn: date.completedOn };
  }

  private dateError(reason: 'REQUIRED' | 'TOO_FAR' | 'FUTURE', backdateDays: number): Error {
    return reason === 'REQUIRED' ? new TaskCompletionDateRequiredError(backdateDays) : new TaskBackdateTooFarError(backdateDays);
  }

  /** Who is told: whoever gave the task and its followers on every change; the reviewer when it awaits review; the assignee when it is sent back. */
  private async announce(task: TaskRow, decision: Allowed, actorUserId: string, tx: TransactionContext): Promise<void> {
    const watchers = [task.creatorUserId, ...(await this.tasks.followerIds(task.id))];
    const common = { task, actorUserId, tx };
    if (decision.to === 'done') return this.notifier.send({ ...common, kind: 'finished', recipients: watchers });
    await this.notifier.send({ ...common, kind: 'statusChanged', recipients: watchers, toStatus: decision.to });
    if (decision.to === 'awaiting_review') await this.notifier.send({ ...common, kind: 'awaitingReview', recipients: [task.reviewerUserId] });
    if (decision.needsNote) await this.notifier.send({ ...common, kind: 'completionRejected', recipients: [task.assigneeUserId] });
  }

  private audit(actorId: string, entityId: string, changes: Record<string, unknown>): void {
    const event: AuditEvent = { actorId, action: TASK_AUDIT.moved, entityType: 'task', entityId, changes };
    this.events.emit(AUDIT_EVENT, event);
  }
}
