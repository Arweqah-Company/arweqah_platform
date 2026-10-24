/** Published through the outbox when an employee's service is ended, so other modules (tasks) can react without importing employees. */
export const EMPLOYEE_TERMINATED_TOPIC = 'employees.terminated';

export interface EmployeeTerminatedPayload {
  employeeId: string;
  userId: string;
  /** ISO date of the last working day. */
  endDate: string;
  [key: string]: unknown;
}
