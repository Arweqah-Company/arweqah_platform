import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OrgLeadersService } from '../../application/services/org-leaders.service';
import { OrgVersionsService } from '../../application/services/org-versions.service';

/** The nightly pass of the structure (a few minutes after midnight in Riyadh): dated changes of units whose day came, and the leaders that started or ended. */
@Injectable()
export class OrgScheduleJob {
  private readonly logger = new Logger(OrgScheduleJob.name);

  constructor(
    private readonly versions: OrgVersionsService,
    private readonly leaders: OrgLeadersService,
  ) {}

  @Cron('15 0 * * *', { timeZone: 'Asia/Riyadh' })
  async scheduled(): Promise<void> {
    // One failing step must not stop the other: the leaders still refresh when the dated changes of units could not be applied.
    try {
      await this.versions.applyDue();
    } catch (error) {
      this.logger.error(`Dated changes of units could not be applied: ${error instanceof Error ? error.message : String(error)}`);
    }
    const moved = await this.leaders.refreshCurrentCopies();
    if (moved) this.logger.log(`Leader changed in ${moved} unit(s)`);
  }
}
