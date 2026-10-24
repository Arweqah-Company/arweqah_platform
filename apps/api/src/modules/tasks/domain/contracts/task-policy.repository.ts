import type { TaskPolicyInput } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import type { PolicyRecord } from '../types/task.types';

export abstract class TaskPolicyRepository {
  /** The company's policy, or null when nobody saved one (the defaults apply). */
  abstract find(companyId: string): Promise<PolicyRecord | null>;
  abstract save(companyId: string, input: TaskPolicyInput, tx: TransactionContext): Promise<void>;
  abstract all(): Promise<PolicyRecord[]>;
}
