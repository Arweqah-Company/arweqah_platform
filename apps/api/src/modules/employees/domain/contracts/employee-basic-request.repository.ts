import type { BasicRequestInput } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import type { EmployeeBasicRequest } from '../entities/employee-basic-request.entity';

export abstract class EmployeeBasicRequestRepository {
  /** The employee's newest request, whatever its state. */
  abstract latest(employeeId: string): Promise<EmployeeBasicRequest | null>;
  abstract pending(employeeId: string): Promise<EmployeeBasicRequest | null>;
  abstract insert(values: { employeeId: string; changes: BasicRequestInput; submittedAt: Date }, tx: TransactionContext): Promise<EmployeeBasicRequest>;
  /** Moves a request that is still pending to its final state; false when somebody decided or cancelled it first. */
  abstract settle(id: string, to: { status: 'approved' | 'rejected' | 'cancelled'; decidedBy: string; decidedAt: Date; rejectionReason?: string | null }, tx: TransactionContext): Promise<boolean>;
}
