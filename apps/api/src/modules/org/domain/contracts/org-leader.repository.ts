import type { TransactionContext } from '../../../../common/domain/transaction-context';
import type { LeaderRow, NewLeader } from '../types/org-leader.types';

/** Who leads units for each company, and who acts for them (FR-100). */
export abstract class OrgLeaderRepository {
  /** Serializes the changes of one unit's leaders until the transaction ends. */
  abstract lock(nodeId: string, tx: TransactionContext): Promise<void>;
  /** Every row of a unit, newest start first. */
  abstract rowsOf(nodeId: string, tx?: TransactionContext): Promise<LeaderRow[]>;
  abstract byId(id: string): Promise<LeaderRow | null>;
  abstract insert(row: NewLeader, tx: TransactionContext): Promise<string>;
  abstract close(id: string, validTo: string | null, tx: TransactionContext): Promise<void>;
  abstract remove(id: string, tx: TransactionContext): Promise<void>;
  /** The rows in force on a day, for every live unit. */
  abstract activeRows(day: string): Promise<LeaderRow[]>;
  /** Units that have any leader row (their current copy is kept up to date by the nightly job). */
  abstract nodesWithRows(): Promise<string[]>;
  /** Every employee that has a row in a unit (in force, past or waiting). */
  abstract employeesOf(nodeId: string): Promise<string[]>;
  /** The current copy of the leader on the unit (`org_nodes.manager_id`). */
  abstract setNodeManager(nodeId: string, employeeId: string | null, tx: TransactionContext): Promise<void>;
}
