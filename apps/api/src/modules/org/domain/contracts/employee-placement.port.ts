/** The people holding a title in one company: how many, and the first of them (the earliest to start, then by id), who would be a manager. */
export interface TitleHolders {
  count: number;
  firstId: string;
  firstName: string;
}

/** An active employee placed in a title. */
export interface PlacedEmployee {
  id: string;
  companyId: string;
  titleId: string;
  /** The manager in force today. */
  managerId: string | null;
}

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
  /** Direct employees of each unit per company: `unitId → companyId → count` (active employees only). */
  abstract staffByUnitAndCompany(): Promise<Map<string, Map<string, number>>>;
  /** The company of each of the given employees. */
  abstract companiesOf(employeeIds: string[]): Promise<Map<string, string>>;
  /** The names of the people behind user ids (the sign-in accounts that made a change). */
  abstract userNamesOf(userIds: string[]): Promise<Map<string, string>>;
  /** Holders of each title per company, active employees only: `titleId → companyId → holders`. */
  abstract holdersByTitle(): Promise<Map<string, Map<string, TitleHolders>>>;
  /** The active employees placed in any of the titles. */
  abstract placedEmployees(titleIds: string[]): Promise<PlacedEmployee[]>;
}
