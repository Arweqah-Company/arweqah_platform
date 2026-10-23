import type { DepartmentFacts, PersonRecord } from '../types/ticket.types';

/** What the ticket rules need to know about the organization and about people (read-only). */
export abstract class TicketDirectory {
  /** Departments (organization nodes of the "department" level) that are active; all of them, or the given ones. */
  abstract departments(nodeIds?: string[]): Promise<DepartmentFacts[]>;
  /** The departments this person manages. */
  abstract managedDepartmentIds(userId: string): Promise<string[]>;
  /** An active employee's account, or null. */
  abstract activeEmployee(userId: string): Promise<PersonRecord | null>;
  abstract people(userIds: string[]): Promise<Map<string, PersonRecord>>;
  /** Active employees of a company who can be picked as the assignee of a type (searched by name or number, at most 30). */
  abstract assignableEmployees(companyId: string, search?: string): Promise<PersonRecord[]>;
}
