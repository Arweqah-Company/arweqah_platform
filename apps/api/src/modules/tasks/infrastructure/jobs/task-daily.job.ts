import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { riyadhToday } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { AppConfig } from '../../../../config/app-config.service';
import { TaskArchiveService } from '../../application/services/task-archive.service';
import { TaskReminderService } from '../../application/services/task-reminder.service';

/** Weekday of an ISO date as the policies number it (0 = Sunday). */
const weekdayOf = (isoDate: string): number => new Date(`${isoDate}T00:00:00Z`).getUTCDay();

/** The daily work of tasks (Asia/Riyadh): reminders, overdue notices and archiving in the morning, the manager digest after. Skipped in tests, which call the services themselves. */
@Injectable()
export class TaskDailyJob {
  constructor(
    private readonly reminders: TaskReminderService,
    private readonly archive: TaskArchiveService,
    private readonly config: AppConfig,
    private readonly clock: Clock,
  ) {}

  @Cron('0 6 * * *', { timeZone: 'Asia/Riyadh' })
  async morning(): Promise<void> {
    if (this.config.isTest) return;
    const today = riyadhToday(this.clock.now());
    await this.reminders.remind(today);
    await this.reminders.notifyOverdue(today);
    await this.archive.archiveDue();
  }

  @Cron('0 8 * * *', { timeZone: 'Asia/Riyadh' })
  async digest(): Promise<void> {
    if (this.config.isTest) return;
    const today = riyadhToday(this.clock.now());
    await this.reminders.sendDigest(today, weekdayOf(today));
  }
}
