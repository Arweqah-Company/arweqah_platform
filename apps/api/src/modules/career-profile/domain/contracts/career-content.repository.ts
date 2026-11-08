import type { CareerContentStatus } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import type { CodedContent } from '../rules/learning-links.rules';
import type { ContentWrite, StoredCareerContent } from '../types/career-profile.types';

export abstract class CareerContentRepository {
  /** The stored content of a title; null when nothing was saved yet. */
  abstract find(titleId: string, tx?: TransactionContext): Promise<StoredCareerContent | null>;
  /** Takes the title's lock for the rest of the transaction (it works before the first row exists), so two writes of the same title run one after the other. */
  abstract lock(titleId: string, tx: TransactionContext): Promise<StoredCareerContent | null>;
  /** Saves the content at `version` (creating the row at version 1) and keeps a snapshot of it. Returns the stored row. */
  abstract save(write: ContentWrite, tx: TransactionContext): Promise<StoredCareerContent>;
  /** The titles with these codes (upper case), each with its content or null while nothing was saved. */
  abstract findByCodes(codes: readonly string[]): Promise<Map<string, CodedContent>>;
  abstract setStatus(titleId: string, status: CareerContentStatus, actorId: string, tx: TransactionContext): Promise<void>;
}
