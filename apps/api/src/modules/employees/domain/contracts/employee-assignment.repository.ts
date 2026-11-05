import type { AssignmentField } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import type { EmployeeAssignment } from '../entities/employee-assignment.entity';

/** What a same-day correction rewrites in a period. */
export type AssignmentValues = Partial<Pick<EmployeeAssignment, 'orgNodeId' | 'jobTitleId' | 'managerEmployeeId' | 'managerSource' | 'reason' | 'createdBy' | 'appliedAt'>>;

/** Names of the people a history mentions: managers (employees) and the users who made the changes. */
export interface PeopleNames {
  managers: Map<string, { nameAr: string; nameEn: string }>;
  users: Map<string, string>;
}

export abstract class EmployeeAssignmentRepository {
  /** The history of one employee, oldest first, optionally of one field. */
  abstract history(employeeId: string, field?: AssignmentField, tx?: TransactionContext): Promise<EmployeeAssignment[]>;
  abstract peopleNames(managerIds: string[], userIds: string[]): Promise<PeopleNames>;
  abstract findById(id: string): Promise<EmployeeAssignment | null>;
  /** Locks the employee's row so two changes of the same person queue instead of overlapping. */
  abstract lockEmployee(employeeId: string, tx: TransactionContext): Promise<void>;
  abstract insert(rows: Partial<EmployeeAssignment>[], tx: TransactionContext): Promise<EmployeeAssignment[]>;
  /** Rewrites the value and reason of a period (only the open period of the same day is corrected this way). */
  abstract overwrite(id: string, values: AssignmentValues, tx: TransactionContext): Promise<void>;
  abstract close(id: string, validTo: string | null, tx: TransactionContext): Promise<void>;
  abstract remove(id: string, tx: TransactionContext): Promise<void>;
  abstract markApplied(id: string, at: Date, tx: TransactionContext): Promise<void>;
  /** Waiting periods whose day has come (not yet written to the employee record), oldest first. */
  abstract due(today: string): Promise<EmployeeAssignment[]>;
}
