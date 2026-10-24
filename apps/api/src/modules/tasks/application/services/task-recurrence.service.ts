import { Injectable } from '@nestjs/common';
import { riyadhToday } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import type { TransactionContext } from '../../../../common/application/transaction-runner';
import { TaskMaintenanceRepository } from '../../domain/contracts/task-maintenance.repository';
import { TaskRepository } from '../../domain/contracts/task.repository';
import { nextDueDate } from '../../domain/rules/task-recurrence.rules';
import type { TaskRow } from '../../domain/types/task.types';
import { TaskNotifier } from './task-notifier.service';

/** A repeating task creates its next occurrence when it is finished, once per due date, never in the past. */
@Injectable()
export class TaskRecurrenceService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly maintenance: TaskMaintenanceRepository,
    private readonly notifier: TaskNotifier,
    private readonly clock: Clock,
  ) {}

  async spawnNext(task: TaskRow, tx: TransactionContext): Promise<string | null> {
    const dueDate = this.nextDate(task);
    const parentId = task.recurrenceParentId ?? task.id;
    if (!dueDate || (await this.maintenance.existsOccurrence(parentId, dueDate, tx))) return null;
    const id = await this.tasks.insert(
      {
        companyId: task.companyId, title: task.title, description: task.description, assigneeUserId: task.assigneeUserId, creatorUserId: task.creatorUserId,
        reviewerUserId: task.reviewerUserId, approverUserId: null, status: 'todo', priority: task.priority, dueDate, estimateMinutes: task.estimateMinutes,
        tagId: task.tagId, urgentManual: task.urgentManual, needsReview: task.needsReview, recurrence: task.recurrence, recurrenceEnd: task.recurrenceEnd,
        recurrenceParentId: parentId, source: task.source, ticketId: task.ticketId, projectId: task.projectId,
      },
      tx,
    );
    await this.tasks.appendEvent({ taskId: id, type: 'created', actorUserId: null, toStatus: 'todo' }, tx);
    await this.notifier.send({ kind: 'assigned', task: { id, number: task.number, title: task.title }, recipients: [task.assigneeUserId], tx });
    return id;
  }

  /** The next due date that is today or later (a series that fell behind does not pile up past dates). */
  private nextDate(task: TaskRow): string | null {
    const today = riyadhToday(this.clock.now());
    let next = nextDueDate(task.dueDate, task.recurrence, task.recurrenceEnd);
    while (next && next < today) next = nextDueDate(next, task.recurrence, task.recurrenceEnd);
    return next;
  }
}
