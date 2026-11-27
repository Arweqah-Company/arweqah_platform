import type { ProblemReportSettingsDto } from '@arweqah-platform/shared';

/** Port to the stored settings of the «report a problem» button and to what the limit counts. */
export abstract class ProblemReportRepository {
  abstract settings(): Promise<ProblemReportSettingsDto>;
  abstract saveSettings(values: ProblemReportSettingsDto, updatedBy: string): Promise<void>;
  /** Tickets of this type the person sent since the given moment (the reports they made). */
  abstract recentCount(userId: string, typeId: string, since: Date): Promise<number>;
}
