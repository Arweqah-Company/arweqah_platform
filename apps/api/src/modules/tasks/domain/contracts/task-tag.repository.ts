import type { TaskTagInput } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import type { TagRecord } from '../types/task.types';

export abstract class TaskTagRepository {
  abstract find(id: string): Promise<TagRecord | null>;
  /** Tags of the given departments (all when `nodeIds` is null) of a company. */
  abstract list(companyId: string | null, nodeIds: readonly string[] | null): Promise<TagRecord[]>;
  abstract insert(input: TaskTagInput, tx: TransactionContext): Promise<string>;
  abstract update(id: string, input: TaskTagInput, tx: TransactionContext): Promise<void>;
  abstract inUse(id: string): Promise<boolean>;
  abstract remove(id: string, tx: TransactionContext): Promise<void>;
  /** The departments (units of the department level) of a company, or of the given nodes; null means no limit. */
  abstract departments(companyId: string | null, nodeIds: readonly string[] | null): Promise<{ id: string; companyId: string }[]>;
  /** Is the node a department (a unit of the level that came from the department template) of an active structure? */
  abstract isDepartment(nodeId: string): Promise<boolean>;
}
