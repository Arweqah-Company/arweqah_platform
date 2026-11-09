import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { riyadhToday } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { AppConfig } from '../../../../config/app-config.service';
import { CareerReminderService } from '../../application/services/career-reminder.service';

/** The schedule of the career-path reminders (Asia/Riyadh): employees with late items on Sundays, the managers' report on the first of the month. Skipped in tests. */
@Injectable()
export class CareerRemindersJob {
  constructor(
    private readonly reminders: CareerReminderService,
    private readonly config: AppConfig,
    private readonly clock: Clock,
  ) {}

  @Cron('0 8 * * 0', { timeZone: 'Asia/Riyadh' })
  async weekly(): Promise<void> {
    if (this.config.isTest) return;
    await this.reminders.remindEmployees(riyadhToday(this.clock.now()));
  }

  @Cron('0 8 1 * *', { timeZone: 'Asia/Riyadh' })
  async monthly(): Promise<void> {
    if (this.config.isTest) return;
    await this.reminders.reportToManagers(riyadhToday(this.clock.now()));
  }
}
