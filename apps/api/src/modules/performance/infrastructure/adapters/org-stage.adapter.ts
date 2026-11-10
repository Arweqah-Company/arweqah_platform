import { Injectable } from '@nestjs/common';
import { DEVELOPMENT_STAGE_CODES } from '@arweqah-platform/shared';
import { JobTitlesService } from '../../../org/application/services/job-titles.service';
import { PerformanceStagePort } from '../../domain/contracts/performance-roster.port';

/** The structure module's job titles, seen as the development stage the evaluation needs (the stage number is the position in the five: foundation = 1). */
@Injectable()
export class OrgStageAdapter extends PerformanceStagePort {
  constructor(private readonly titles: JobTitlesService) {
    super();
  }

  async stageOf(titleId: string): Promise<{ stage: number; hoursPerYear: number } | null> {
    const { stage } = await this.titles.identity(titleId);
    return stage ? { stage: DEVELOPMENT_STAGE_CODES.indexOf(stage.code) + 1, hoursPerYear: stage.hoursPerYear } : null;
  }

  async titleNames(titleId: string): Promise<{ nameAr: string; nameEn: string }> {
    const { nameAr, nameEn } = await this.titles.identity(titleId);
    return { nameAr, nameEn };
  }
}
