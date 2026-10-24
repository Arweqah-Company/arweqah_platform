import { Injectable } from '@nestjs/common';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { TaskMaintenanceRepository } from '../../domain/contracts/task-maintenance.repository';
import { TaskNotifier } from './task-notifier.service';

/** The daily notices: a reminder before the due date, the notice that a due date passed, and the weekly summary for managers. Each runs once per task. */
@Injectable()
export class TaskReminderService {
  constructor(
    private readonly maintenance: TaskMaintenanceRepository,
    private readonly notifier: TaskNotifier,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
  ) {}

  /** The assignee is reminded once, when the due date is within the policy's reminder days. */
  async remind(today: string): Promise<number> {
    const due = await this.maintenance.dueForReminder(today);
    await this.tx.run(async (tx) => {
      for (const task of due) await this.notifier.send({ kind: 'reminder', task, recipients: [task.assigneeUserId], tx });
    });
    await this.maintenance.markReminded(due.map((t) => t.id));
    return due.length;
  }

  /** The assignee and whoever gave the task are told once that the due date passed. */
  async notifyOverdue(today: string): Promise<number> {
    const late = await this.maintenance.overdueUnnotified(today);
    await this.tx.run(async (tx) => {
      for (const task of late) await this.notifier.send({ kind: 'overdue', task, recipients: [task.assigneeUserId, task.creatorUserId], tx });
    });
    await this.maintenance.markOverdueNotified(late.map((t) => t.id));
    return late.length;
  }

  /** On each company's digest day (Sunday by default) every manager hears how many tasks of their direct reports are overdue. */
  async sendDigest(today: string, weekday: number): Promise<number> {
    const rows = await this.maintenance.overdueDigest(today, weekday);
    await this.tx.run(async (tx) => {
      for (const row of rows) await this.notifier.send({ kind: 'digest', task: { id: '', number: 0, title: '' }, recipients: [row.managerUserId], count: row.overdue, tx });
    });
    return rows.length;
  }

  now(): Date {
    return this.clock.now();
  }
}
