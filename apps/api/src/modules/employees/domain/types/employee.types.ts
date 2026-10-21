import type { Employee } from '../entities/employee.entity';

/** The database columns of an employee as written by the service: every column except the ones the database owns. */
export type EmployeeValues = Partial<Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>>;
