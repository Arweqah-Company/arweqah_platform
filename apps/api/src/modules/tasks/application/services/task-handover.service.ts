import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { riyadhToday, type EmployeeTerminatedPayload } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner, type TransactionContext } from '../../../../common/application/transaction-runner';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { JobScheduler } from '../../../../core/messaging/application/outbox';
import { TaskMaintenanceRepository } from '../../domain/contracts/task-maintenance.repository';
import { TaskRepository } from '../../domain/contracts/task.repository';
import type { OpenWorkRow, TaskPatch } from '../../domain/types/task.types';
import { TASK_AUDIT, TASK_TOPICS } from '../messages/task.messages';
import { TaskNotifier } from './task-notifier.service';

const dedupeKey = (userId: string): string => `task-handover:${userId}`;

/**
 * When an employee leaves, on their last day their open tasks (and the reviews they owe) go to their direct manager.
 * Tasks of a project would go to the project manager; the projects module is not built yet, so the manager takes them too.
 * Somebody with no manager keeps their tasks and the sweep is written to the audit log for the platform's attention.
 */
@Injectable()
export class TaskHandoverService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly maintenance: TaskMaintenanceRepository,
    private readonly notifier: TaskNotifier,
    private readonly scheduler: JobScheduler,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  /** The employee's service ended: hand over now when the last day is today or past, else schedule it for the start of that day (Riyadh). */
  async onTerminated(payload: EmployeeTerminatedPayload): Promise<void> {
    const today = riyadhToday(this.clock.now());
    if (payload.endDate <= today) {
      await this.handOver(payload.userId);
      return;
    }
    const runAt = new Date(new Date(`${payload.endDate}T00:00:00+03:00`).getTime());
    await this.tx.run((tx) => this.scheduler.schedule(TASK_TOPICS.handover, { userId: payload.userId }, { runAt, dedupeKey: dedupeKey(payload.userId), tx }));
  }

  /** Moves the open work of `userId` to their manager; returns how many tasks moved. Running it again moves nothing more. */
  async handOver(userId: string): Promise<number> {
    const manager = await this.maintenance.reportingManagerOf(userId);
    const work = await this.maintenance.openWorkOf(userId);
    if (!work.length) return 0;
    if (!manager || manager === userId) {
      this.audit(userId, TASK_AUDIT.handoverSkipped, { tasks: work.length });
      return 0;
    }
    const moved = await this.tx.run(async (tx) => {
      let count = 0;
      for (const task of work) count += (await this.move(task, userId, manager, tx)) ? 1 : 0;
      await this.notifier.send({ kind: 'handedOverMany', task: { id: '', number: 0, title: '' }, recipients: [manager], count, tx });
      return count;
    });
    this.audit(userId, TASK_AUDIT.handedOver, { tasks: moved, toUserId: manager });
    return moved;
  }

  private async move(task: OpenWorkRow, from: string, to: string, tx: TransactionContext): Promise<boolean> {
    const patch: TaskPatch = { lastActivityAt: this.clock.now() };
    if (task.assigneeUserId === from) patch.assigneeUserId = to;
    if (task.reviewerUserId === from) patch.reviewerUserId = to;
    if (!(await this.tasks.patch(task.id, task.revision, patch, tx))) return false;
    await this.tasks.appendEvent({ taskId: task.id, type: 'handed_over', actorUserId: null }, tx);
    if (patch.assigneeUserId) await this.notifier.send({ kind: 'reassigned', task, recipients: [task.creatorUserId], actorUserId: to, tx });
    return true;
  }

  private audit(userId: string, action: string, changes: Record<string, unknown>): void {
    const event: AuditEvent = { actorId: null, action, entityType: 'user', entityId: userId, changes };
    this.events.emit(AUDIT_EVENT, event);
  }
}
