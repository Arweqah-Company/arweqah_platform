import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CorePermission as P, type DecideTaskInput } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner, type TransactionContext } from '../../../../common/application/transaction-runner';
import { ForbiddenError } from '../../../../common/domain/domain-error';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { WorkflowEngine } from '../../../../core/workflow/application/workflow-engine';
import { TaskDirectory } from '../../domain/contracts/task-directory.port';
import { TaskRepository } from '../../domain/contracts/task.repository';
import { TaskNotApprovableError, TaskRevisionConflictError, TaskStateInvalidError } from '../../domain/errors/task.errors';
import { TASK_APPROVAL_KEY } from '../../domain/rules/task-approval.machine';
import type { TaskPatch, TaskRow, TaskViewer } from '../../domain/types/task.types';
import { TASK_AUDIT } from '../messages/task.messages';
import { TaskAccessPolicy } from '../policies/task-access.policy';
import { TaskNotifier } from './task-notifier.service';

const ENTITY = 'task';

/** The approval of a task a person gave to themselves, run by the `task.self_approval` machine of the workflow engine. */
@Injectable()
export class TaskApprovalService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly directory: TaskDirectory,
    private readonly access: TaskAccessPolicy,
    private readonly workflow: WorkflowEngine,
    private readonly notifier: TaskNotifier,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  /** Starts the approval of a new task, inside the transaction that creates it. Nobody approves a task of the top of the structure (it never gets here). */
  async begin(taskId: string, actorUserId: string, tx: TransactionContext): Promise<void> {
    await this.workflow.start({ definitionKey: TASK_APPROVAL_KEY, entityType: ENTITY, entityId: taskId, actorId: actorUserId, input: { projectApproval: false }, tx });
  }

  async approve(viewer: TaskViewer, id: string, input: DecideTaskInput): Promise<void> {
    await this.decide(viewer, id, input, 'APPROVE');
  }

  async reject(viewer: TaskViewer, id: string, input: DecideTaskInput): Promise<void> {
    await this.decide(viewer, id, input, 'REJECT');
  }

  /** The owner of a rejected task sends it again: to the manager, or straight to do when nobody has to approve. */
  async resubmit(viewer: TaskViewer, id: string, revision: number): Promise<void> {
    const task = await this.visible(viewer, id);
    if (task.status !== 'rejected') throw new TaskStateInvalidError('resubmit', task.status);
    if (task.creatorUserId !== viewer.userId || viewer.scopes[P.TasksResubmit] == null) throw new ForbiddenError();
    const approverUserId = (await this.directory.person(viewer.userId))?.managerUserId ?? null;
    const status = approverUserId ? 'pending_approval' : 'todo';
    await this.tx.run(async (tx) => {
      await this.change(task, { status, approverUserId, lastActivityAt: this.clock.now() }, revision, tx);
      await this.tasks.appendEvent({ taskId: id, type: 'resubmitted', actorUserId: viewer.userId, fromStatus: 'rejected', toStatus: status }, tx);
      if (approverUserId) {
        await this.begin(id, viewer.userId, tx);
        await this.notifier.send({ kind: 'approvalRequested', task, recipients: [approverUserId], actorUserId: viewer.userId, tx });
      }
    });
    this.audit(viewer.userId, TASK_AUDIT.resubmitted, id, { to: status });
  }

  private async decide(viewer: TaskViewer, id: string, input: DecideTaskInput, event: 'APPROVE' | 'REJECT'): Promise<void> {
    const task = await this.visible(viewer, id);
    const key = event === 'APPROVE' ? P.TasksApprove : P.TasksReject;
    const instance = await this.workflow.findByEntity(ENTITY, id);
    if (task.status !== 'pending_approval' || !this.access.isApprover(viewer, task, key) || !instance || instance.isDone) throw new TaskNotApprovableError();
    const approved = event === 'APPROVE';
    const status = approved ? 'todo' : 'rejected';
    await this.tx.run(async (tx) => {
      await this.workflow.send({ instanceId: instance.id, event: { type: event }, actorId: viewer.userId, comment: input.note, tx });
      await this.change(task, { status, lastActivityAt: this.clock.now() }, input.revision, tx);
      await this.tasks.appendEvent({ taskId: id, type: approved ? 'approved' : 'rejected', actorUserId: viewer.userId, fromStatus: 'pending_approval', toStatus: status, note: input.note ?? null }, tx);
      await this.notifier.send({ kind: approved ? 'approved' : 'approvalRejected', task, recipients: [task.creatorUserId], actorUserId: viewer.userId, tx });
    });
    this.audit(viewer.userId, approved ? TASK_AUDIT.approved : TASK_AUDIT.rejected, id, {});
  }

  private async visible(viewer: TaskViewer, id: string): Promise<TaskRow> {
    const row = await this.tasks.find(id, viewer.userId);
    this.access.assertCanView(viewer, row);
    return row as TaskRow;
  }

  private async change(task: TaskRow, patch: TaskPatch, revision: number, tx: TransactionContext): Promise<void> {
    if (!(await this.tasks.patch(task.id, revision, patch, tx))) throw new TaskRevisionConflictError();
  }

  private audit(actorId: string, action: string, entityId: string, changes: Record<string, unknown>): void {
    const event: AuditEvent = { actorId, action, entityType: 'task', entityId, changes };
    this.events.emit(AUDIT_EVENT, event);
  }
}
