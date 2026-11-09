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
/** An active employee who holds a title, with the user of their direct manager. */
export interface CareerHolder {
  employeeId: string;
  userId: string;
  titleId: string;
  managerUserId: string | null;
}

export abstract class EmployeeCareerPort {
  abstract forUser(userId: string): Promise<CareerEmployee | null>;
  /** The active employees holding a title. */
  abstract holderCount(titleId: string): Promise<number>;
  /** The user of the employee's direct manager; null when there is none or the manager has no account. */
  /** The user account of an employee; null when they have none. */
  /** Every active employee who holds a title (the reminders and the monthly report read them). */
  abstract holders(): Promise<CareerHolder[]>;
  abstract userOf(employeeId: string): Promise<string | null>;
  abstract managerUserId(employeeId: string): Promise<string | null>;
}
