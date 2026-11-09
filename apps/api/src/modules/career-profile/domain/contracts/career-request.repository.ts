import type { RequestLevel, RequestsQuery } from '@arweqah-platform/shared';
import type { ScopeFilter } from '../../../../core/access/domain/access-context';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import type { RequestDecision, RequestRow, RequestWrite } from '../types/career-profile.types';

export abstract class CareerRequestRepository {
  abstract insert(write: RequestWrite, tx: TransactionContext): Promise<RequestRow>;
  abstract findById(id: string, tx?: TransactionContext): Promise<RequestRow | null>;
  /** Every request of an employee, newest first. */
  abstract forEmployee(employeeId: string): Promise<RequestRow[]>;
  /**
   * The requests the viewer may see: the ones waiting for them (`mine`), or the ones of the people the scope reaches. Searched, filtered and paged here.
   * `filter` is null when the viewer has no view scope (then only `mine` returns anything).
   */
  abstract list(query: RequestsQuery, viewer: { userId: string; filter: ScopeFilter | null }): Promise<{ items: RequestRow[]; total: number }>;
  /** Whether the scope reaches the employee of the request. */
  abstract inScope(id: string, filter: ScopeFilter): Promise<boolean>;
  /** Applies a decision only while the request is pending with this person: false when someone else decided first. */
  abstract decide(id: string, approverUserId: string, decision: RequestDecision, tx: TransactionContext): Promise<boolean>;
  /** Moves a pending request that is at `from` up to the next person: false when it moved already. */
  abstract escalate(id: string, from: RequestLevel, to: { level: RequestLevel; approverUserId: string | null }, tx: TransactionContext): Promise<boolean>;
  /** The riyals approved for an employee between two instants (the budget year). */
  abstract approvedCost(employeeId: string, from: Date, to: Date): Promise<number>;
}
