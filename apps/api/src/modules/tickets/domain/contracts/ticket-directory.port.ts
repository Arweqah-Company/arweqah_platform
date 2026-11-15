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
  /** The company of each active employee among these accounts (accounts that are not active employees are missing from the map). */
  abstract companiesOf(userIds: string[]): Promise<Map<string, string>>;
  /** Active employees of a company for the @ list (by name, at most 20). */
  abstract mentionables(companyId: string, search?: string): Promise<PersonRecord[]>;
  /** Active employees of a company sitting in the given units (null = anywhere in the company), by name or number, at most 30: who a ticket may be reassigned to. `userId` narrows to that one person. */
  abstract reassignCandidates(companyId: string, nodeIds: readonly string[] | null, filter: { search?: string; userId?: string }): Promise<PersonRecord[]>;
  /** Active employees sitting directly in a unit who can be picked as handlers of its types (searched by name or number, at most 30). */
  abstract assignableEmployees(nodeId: string, search?: string): Promise<PersonRecord[]>;
  /** Of these accounts, the ones that are active employees sitting directly in the unit. */
  abstract membersOf(nodeId: string, userIds: string[]): Promise<string[]>;
}
