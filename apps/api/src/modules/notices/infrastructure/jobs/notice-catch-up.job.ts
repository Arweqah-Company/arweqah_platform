import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AppConfig } from '../../../../config/app-config.service';
import { NoticeDeliveryService } from '../../application/services/notice-delivery.service';

/** The nightly pass (a few minutes after midnight in Riyadh, like the structure's): every published notice reaches the people who joined its audience after the publication. Tests call `catchUp` themselves. */
@Injectable()
export class NoticeCatchUpJob {
  private readonly logger = new Logger(NoticeCatchUpJob.name);

  constructor(
    private readonly delivery: NoticeDeliveryService,
    private readonly config: AppConfig,
  ) {}

  @Cron('15 0 * * *', { timeZone: 'Asia/Riyadh' })
  async scheduled(): Promise<void> {
    if (this.config.isTest) return;
    try {
      const reached = await this.delivery.catchUp();
      if (reached) this.logger.log(`Notices reached ${reached} more people who joined their audience`);
    } catch (error) {
      this.logger.error(`The nightly pass of notices failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
