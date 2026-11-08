/** The employee behind a user, as the career path needs them. */
export interface CareerEmployee {
  employeeId: string;
  /** The title the employee holds today; null before they are placed. */
  titleId: string | null;
  isSystemAccount: boolean;
  fullName: string;
  /** The direct manager's name; null when there is none. */
  managerName: string | null;
}

/** What the career path asks of the employees (implemented by the employees module, so this module never depends on it). */
export abstract class EmployeeCareerPort {
  abstract forUser(userId: string): Promise<CareerEmployee | null>;
  /** The active employees holding a title. */
  abstract holderCount(titleId: string): Promise<number>;
}
