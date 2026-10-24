import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { riyadhToday, type TaskDto, type TimeEntryInput } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner, type TransactionContext } from '../../../../common/application/transaction-runner';
import { ForbiddenError } from '../../../../common/domain/domain-error';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { TaskMaintenanceRepository } from '../../domain/contracts/task-maintenance.repository';
import { TaskRepository } from '../../domain/contracts/task.repository';
import { TaskBackdateTooFarError } from '../../domain/errors/task.errors';
import { isWorkedOnAllowed } from '../../domain/rules/task-dates.rules';
import type { TaskRow, TaskViewer } from '../../domain/types/task.types';
import { TASK_AUDIT } from '../messages/task.messages';
import { TaskAccessPolicy } from '../policies/task-access.policy';
import { TaskNotifier } from './task-notifier.service';
import { TaskPolicyService } from './task-policy.service';
import { TasksService } from './tasks.service';

/** The assignee logs the time they worked, up to the policy's back-dating days; passing the estimate tells the assignee and whoever gave the task, once. */
@Injectable()
export class TaskTimeService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly maintenance: TaskMaintenanceRepository,
    private readonly access: TaskAccessPolicy,
    private readonly policies: TaskPolicyService,
    private readonly notifier: TaskNotifier,
    private readonly details: TasksService,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  async log(viewer: TaskViewer, id: string, input: TimeEntryInput): Promise<TaskDto> {
    const row = await this.tasks.find(id, viewer.userId);
    this.access.assertCanView(viewer, row);
    const task = row as TaskRow;
    if (!this.access.abilities(viewer, task).logTime) throw new ForbiddenError();
    const policy = await this.policies.forCompany(task.companyId);
    const today = riyadhToday(this.clock.now());
    const workedOn = input.workedOn ?? today;
    if (!isWorkedOnAllowed(workedOn, today, policy.backdateDays)) throw new TaskBackdateTooFarError(policy.backdateDays);
    await this.tx.run(async (tx) => {
      await this.tasks.addTime({ taskId: id, userId: viewer.userId, minutes: input.minutes, workedOn }, tx);
      await this.tasks.appendEvent({ taskId: id, type: 'time_logged', actorUserId: viewer.userId, note: String(input.minutes) }, tx);
      await this.warnIfOverEstimate(task, tx);
    });
    this.audit(viewer.userId, id, input.minutes);
    return this.details.get(viewer, id);
  }

  private async warnIfOverEstimate(task: TaskRow, tx: TransactionContext): Promise<void> {
    if (task.estimateMinutes === null || (await this.tasks.loggedMinutes(task.id, tx)) <= task.estimateMinutes) return;
    if (await this.maintenance.claimEstimateNotice(task.id, tx)) await this.notifier.send({ kind: 'estimateExceeded', task, recipients: [task.assigneeUserId, task.creatorUserId], tx });
  }

  private audit(actorId: string, entityId: string, minutes: number): void {
    const event: AuditEvent = { actorId, action: TASK_AUDIT.timeLogged, entityType: 'task', entityId, changes: { minutes } };
    this.events.emit(AUDIT_EVENT, event);
  }
}
