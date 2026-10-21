import type { TransactionContext } from '../../../../common/domain/transaction-context';

/**
 * What the org module needs to know about (and do to) the employees placed in its units.
 * Implemented by the employees module, so org never depends on it.
 */
export abstract class EmployeePlacementPort {
  abstract countByCompanies(companyIds: string[]): Promise<Map<string, number>>;
  abstract countByNodes(nodeIds: string[]): Promise<Map<string, number>>;
  abstract countByTitles(titleIds: string[]): Promise<Map<string, number>>;
  abstract namesOf(employeeIds: string[]): Promise<Map<string, string>>;
  /** True when the employee exists, optionally within one company. */
  abstract exists(employeeId: string, companyId?: string): Promise<boolean>;
  /** Moves employees of the given units to the target unit, mapping each old job title to a new one. */
  abstract transfer(
    command: { fromNodeIds: string[]; targetNodeId: string; titleMap: Record<string, string>; fallbackTitleId: string },
    tx: TransactionContext,
  ): Promise<number>;
  /** Soft-deletes the employees of the given units, deactivates their accounts and ends their sessions. */
  abstract remove(command: { fromNodeIds: string[]; actorId: string }, tx: TransactionContext): Promise<number>;
}
