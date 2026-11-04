import type { DirectoryQuery, EmployeesQuery, EmployeesSummaryDto, ManagerOptionDto } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import type { ScopeFilter } from '../../../../core/access/domain/access-context';
import type { Employee } from '../entities/employee.entity';
import type { EmployeeValues } from '../types/employee.types';

export abstract class EmployeeRepository {
  abstract findById(id: string): Promise<Employee | null>;
  abstract findByUserId(userId: string): Promise<Employee | null>;
  abstract list(query: EmployeesQuery, scope: ScopeFilter): Promise<{ items: Employee[]; total: number }>;
  /** The active teammates of the viewer (FR-92): same unit, not the viewer, system accounts left out, by name. */
  abstract team(query: DirectoryQuery, viewer: Employee): Promise<{ items: Employee[]; total: number }>;
  /** The names of employees by id. */
  abstract names(ids: string[]): Promise<Map<string, string>>;
  /** Whether each account may sign in, by user id. */
  abstract activeStates(userIds: string[]): Promise<Map<string, boolean>>;
  /** Inserts an employee; unique and reference violations become domain errors (also under concurrency). */
  abstract insert(values: EmployeeValues, tx: TransactionContext): Promise<Employee>;
  abstract update(id: string, values: EmployeeValues, tx: TransactionContext): Promise<void>;
  abstract emailTaken(email: string, exceptId?: string): Promise<boolean>;
  abstract numberTaken(employeeNumber: string, exceptId?: string): Promise<boolean>;
  abstract idDocumentTaken(idTypeId: string, hash: string, exceptId?: string): Promise<boolean>;
  abstract searchManagers(search: string | undefined, excludeId: string | undefined): Promise<ManagerOptionDto[]>;
  /** True when `candidateManagerId` reports (directly or not) to `employeeId`, i.e. choosing them would create a loop. */
  abstract reportsTo(candidateManagerId: string, employeeId: string): Promise<boolean>;
  abstract exists(id: string): Promise<boolean>;
  /** Dashboard counts inside the scope; `soonUntil` is the end of the "expiring soon" window (ISO date). */
  abstract summary(scope: ScopeFilter, window: { today: string; soonUntil: string }): Promise<EmployeesSummaryDto>;
  /** Employees whose contract ended before `today` and whose account can still sign in. */
  abstract endedStillActive(today: string): Promise<{ id: string; userId: string }[]>;
  /** Says sign-in ended because the contract ended (`at`), or that it came back (null). */
  abstract setAccessEnded(id: string, at: Date | null): Promise<void>;
}
