import type { CatalogItemDto, CatalogItemInput, CycleDate, CycleStage, TemplateSnapshot } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';

export interface CycleRow {
  id: string;
  fiscalYear: number;
  stage: CycleStage;
  openedAt: Date;
  closedAt: Date | null;
  dates: CycleDate[];
  snapshot: TemplateSnapshot;
}

/** The dates HR prepared before a cycle is open, with the fiscal year they were prepared for. */
export interface PendingDates {
  fiscalYear: number;
  dates: CycleDate[];
}

export abstract class PerformanceCycleRepository {
  /** The cycle in progress, else the one closed last, else null. */
  abstract current(): Promise<CycleRow | null>;
  abstract yearExists(fiscalYear: number): Promise<boolean>;
  abstract insert(cycle: { fiscalYear: number; openedBy: string; openedAt: Date; dates: CycleDate[]; snapshot: TemplateSnapshot }, tx: TransactionContext): Promise<CycleRow>;
  /** Writes the stage only while the cycle is still at `from`: false when another request moved it first. */
  abstract setStage(id: string, move: { from: CycleStage; to: CycleStage }, by: { userId: string; at: Date } | null, tx: TransactionContext): Promise<boolean>;
  abstract setDates(id: string, dates: CycleDate[], tx: TransactionContext): Promise<void>;
  /** The dates prepared for the next cycle (before it is open), or null when none were. */
  abstract pendingDates(): Promise<PendingDates | null>;
  abstract savePendingDates(pending: PendingDates, actorId: string, tx: TransactionContext): Promise<void>;
  /** The items of the cycle (or the ones waiting for the next cycle when `cycleId` is null). */
  abstract catalog(cycleId: string | null): Promise<CatalogItemDto[]>;
  abstract addItem(cycleId: string | null, item: CatalogItemInput, tx: TransactionContext): Promise<CatalogItemDto>;
  /** Deletes an item of the given cycle (or of the waiting ones); false when it is not there. */
  abstract removeItem(id: string, cycleId: string | null, tx: TransactionContext): Promise<boolean>;
  /** Gives the waiting items to the cycle that just opened. */
  abstract adoptWaiting(cycleId: string, tx: TransactionContext): Promise<void>;
}
