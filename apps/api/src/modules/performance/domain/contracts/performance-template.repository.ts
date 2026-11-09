import type { FiscalCard, GradeBand, StageTemplate } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';

export const SETTING_KEYS = { scale: 'grade_scale', fiscal: 'fiscal_card' } as const;

export abstract class PerformanceTemplateRepository {
  /** Every stage template kept, by stage number. */
  abstract stages(): Promise<StageTemplate[]>;
  /** Keeps (or replaces) the template of one stage; the source version grows by one. */
  abstract saveStage(template: StageTemplate, actorId: string, tx: TransactionContext): Promise<void>;
  abstract scale(): Promise<GradeBand[] | null>;
  abstract fiscal(): Promise<FiscalCard | null>;
  abstract saveScale(bands: GradeBand[], actorId: string, tx: TransactionContext): Promise<void>;
  abstract saveFiscal(card: FiscalCard, actorId: string, tx: TransactionContext): Promise<void>;
}
