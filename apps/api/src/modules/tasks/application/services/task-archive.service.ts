import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CorePermission as P, type TaskDto } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { ForbiddenError } from '../../../../common/domain/domain-error';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { TaskMaintenanceRepository } from '../../domain/contracts/task-maintenance.repository';
import { TaskRepository } from '../../domain/contracts/task.repository';
import { TaskNotArchivedError, TaskRevisionConflictError } from '../../domain/errors/task.errors';
import type { TaskRow, TaskViewer } from '../../domain/types/task.types';
import { TASK_AUDIT } from '../messages/task.messages';
import { TaskAccessPolicy } from '../policies/task-access.policy';
import { TaskNotifier } from './task-notifier.service';
import { TasksService } from './tasks.service';

/** Standalone tasks are archived (never deleted) after the policy's days from closing, and an authorized person may restore them. */
@Injectable()
export class TaskArchiveService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly maintenance: TaskMaintenanceRepository,
    private readonly access: TaskAccessPolicy,
    private readonly notifier: TaskNotifier,
    private readonly details: TasksService,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  /** The daily sweep: archives what is old enough and tells whoever gave each task. */
  async archiveDue(now: Date = this.clock.now()): Promise<number> {
    const archived = await this.tx.run(async (tx) => {
      const rows = await this.maintenance.archiveStale(now, tx);
      for (const task of rows) {
        await this.tasks.appendEvent({ taskId: task.id, type: 'archived', actorUserId: null }, tx);
        await this.notifier.send({ kind: 'archived', task, recipients: [task.creatorUserId], tx });
      }
      return rows;
    });
    for (const task of archived) this.audit(null, TASK_AUDIT.archived, task.id);
    return archived.length;
  }

  /** Brings an archived task back as it was (its status never changed) and starts its quiet period again. */
  async restore(viewer: TaskViewer, id: string): Promise<TaskDto> {
    const row = await this.tasks.find(id, viewer.userId);
    this.access.assertCanView(viewer, row);
    const task = row as TaskRow;
    if (viewer.scopes[P.TasksRestore] == null) throw new ForbiddenError();
    if (!task.archivedAt) throw new TaskNotArchivedError();
    await this.tx.run(async (tx) => {
      if (!(await this.tasks.patch(id, task.revision, { archivedAt: null, lastActivityAt: this.clock.now() }, tx))) throw new TaskRevisionConflictError();
      await this.tasks.appendEvent({ taskId: id, type: 'restored', actorUserId: viewer.userId }, tx);
      await this.notifier.send({ kind: 'restored', task, recipients: [task.creatorUserId, task.assigneeUserId], actorUserId: viewer.userId, tx });
    });
    this.audit(viewer.userId, TASK_AUDIT.restored, id);
    return this.details.get(viewer, id);
  }

  private audit(actorId: string | null, action: string, entityId: string): void {
    const event: AuditEvent = { actorId, action, entityType: 'task', entityId, changes: {} };
    this.events.emit(AUDIT_EVENT, event);
  }
}
