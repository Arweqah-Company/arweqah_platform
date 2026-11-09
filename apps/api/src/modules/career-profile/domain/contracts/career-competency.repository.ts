import type { TransactionContext } from '../../../../common/domain/transaction-context';
import type { CompetencyLevelRow } from '../types/career-profile.types';

export abstract class CareerCompetencyRepository {
  /** Every level recorded for an employee. */
  abstract forEmployee(employeeId: string): Promise<CompetencyLevelRow[]>;
  /** Records (or replaces) the level of one competency; a null level takes the record back. */
  abstract set(write: { employeeId: string; competency: string; level: string | null; recordedBy: string; at: Date }, tx: TransactionContext): Promise<void>;
}
