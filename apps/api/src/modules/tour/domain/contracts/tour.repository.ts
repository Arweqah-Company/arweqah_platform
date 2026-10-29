import type { TourId } from '@arweqah-platform/shared';
import type { TourStepSetting, UserTourProgress } from '../entities/tour.entities';

export type SettingChange = Partial<Omit<TourStepSetting, 'id' | 'createdAt' | 'updatedAt'>> & Pick<TourStepSetting, 'stepKey'>;

export abstract class TourRepository {
  abstract settings(): Promise<TourStepSetting[]>;
  /** One statement per step: changes the columns given and adds the row only the first time, even for two saves at once. */
  abstract saveSettings(rows: SettingChange[]): Promise<void>;
  abstract deleteSetting(stepKey: string): Promise<void>;
  abstract progress(userId: string, tour: TourId): Promise<UserTourProgress | null>;
  abstract saveProgress(userId: string, tour: TourId, status: UserTourProgress['status'], seenSteps: string[]): Promise<void>;
  abstract clearProgress(userId: string, tour: TourId): Promise<void>;
}
