import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { riyadhToday } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { AppConfig } from '../../../../config/app-config.service';
import { PerformanceReminderSendService } from '../../application/services/performance-reminder-send.service';

/** The schedule of the evaluation-cycle reminders: every day at 08:00 Asia/Riyadh (the service itself skips the weekend). Skipped in tests. */
@Injectable()
export class PerformanceRemindersJob {
  constructor(
    private readonly sender: PerformanceReminderSendService,
    private readonly config: AppConfig,
    private readonly clock: Clock,
  ) {}

  @Cron('0 8 * * *', { timeZone: 'Asia/Riyadh' })
  async daily(): Promise<void> {
    if (this.config.isTest) return;
    await this.sender.run(riyadhToday(this.clock.now()));
  }
}
