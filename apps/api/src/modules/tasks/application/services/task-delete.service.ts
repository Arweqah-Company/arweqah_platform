import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { ForbiddenError } from '../../../../common/domain/domain-error';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { TaskRepository } from '../../domain/contracts/task.repository';
import { TaskRevisionConflictError } from '../../domain/errors/task.errors';
import type { TaskRow, TaskViewer } from '../../domain/types/task.types';
import { TASK_AUDIT } from '../messages/task.messages';
import { TaskAccessPolicy } from '../policies/task-access.policy';

/**
 * «Delete a task» (FR-157): the task is hidden from everyone (`deleted_at`), its record stays in the database. Who may: the person holding
 * `tasks.delete` who is its giver, or whose scope reaches its assignee. A task the person cannot see is 404 (as everywhere), one they see but may not delete is 403.
 */
@Injectable()
export class TaskDeleteService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly access: TaskAccessPolicy,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  async delete(viewer: TaskViewer, id: string): Promise<void> {
    const row = await this.tasks.find(id, viewer.userId);
    this.access.assertCanView(viewer, row);
    const task = row as TaskRow;
    if (!this.access.mayDelete(viewer, task)) throw new ForbiddenError();
    await this.tx.run(async (tx) => {
      if (!(await this.tasks.patch(id, task.revision, { deletedAt: this.clock.now() }, tx))) throw new TaskRevisionConflictError();
    });
    const event: AuditEvent = { actorId: viewer.userId, action: TASK_AUDIT.deleted, entityType: 'task', entityId: id, changes: { number: task.number, title: task.title, status: task.status } };
    this.events.emit(AUDIT_EVENT, event);
  }
}
