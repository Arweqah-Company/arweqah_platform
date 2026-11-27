import { Injectable } from '@nestjs/common';
import { DataSource, MoreThanOrEqual } from 'typeorm';
import type { ProblemReportSettingsDto } from '@arweqah-platform/shared';
import { ProblemReportRepository } from '../../domain/contracts/problem-report.repository';
import { ProblemReportSettings } from '../../domain/entities/problem-report-settings.entity';
import { Ticket } from '../../domain/entities/ticket.entities';

const ROW = 1;
const DEFAULTS: ProblemReportSettingsDto = { enabled: false, ticketTypeId: null, analyzeWithAi: true, sendImageToAi: false, maxPerHour: 10 };

@Injectable()
export class TypeOrmProblemReportRepository extends ProblemReportRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  async settings(): Promise<ProblemReportSettingsDto> {
    const row = await this.ds.getRepository(ProblemReportSettings).findOneBy({ id: ROW });
    return row ? { enabled: row.enabled, ticketTypeId: row.ticketTypeId, analyzeWithAi: row.analyzeWithAi, sendImageToAi: row.sendImageToAi, maxPerHour: row.maxPerHour } : DEFAULTS;
  }

  async saveSettings(values: ProblemReportSettingsDto, updatedBy: string): Promise<void> {
    await this.ds.getRepository(ProblemReportSettings).save({ id: ROW, ...values, updatedBy });
  }

  recentCount(userId: string, typeId: string, since: Date): Promise<number> {
    return this.ds.getRepository(Ticket).count({ where: { senderUserId: userId, typeId, createdAt: MoreThanOrEqual(since) } });
  }
}
