import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { TourId } from '@arweqah-platform/shared';
import { type SettingChange, TourRepository } from '../../domain/contracts/tour.repository';
import { TourStepSetting, UserTourProgress } from '../../domain/entities/tour.entities';

@Injectable()
export class TypeOrmTourRepository extends TourRepository {
  constructor(
    @InjectRepository(TourStepSetting) private readonly steps: Repository<TourStepSetting>,
    @InjectRepository(UserTourProgress) private readonly progresses: Repository<UserTourProgress>,
  ) {
    super();
  }

  settings(): Promise<TourStepSetting[]> {
    return this.steps.find();
  }

  async saveSettings(rows: SettingChange[]): Promise<void> {
    if (rows.length) await this.steps.upsert(rows as never, ['stepKey']);
  }

  async deleteSetting(stepKey: string): Promise<void> {
    await this.steps.delete({ stepKey });
  }

  progress(userId: string, tour: TourId): Promise<UserTourProgress | null> {
    return this.progresses.findOne({ where: { userId, tour } });
  }

  async saveProgress(userId: string, tour: TourId, status: UserTourProgress['status'], seenSteps: string[]): Promise<void> {
    await this.progresses.upsert({ userId, tour, status, seenSteps }, ['userId', 'tour']);
  }

  async clearProgress(userId: string, tour: TourId): Promise<void> {
    await this.progresses.delete({ userId, tour });
  }
}
