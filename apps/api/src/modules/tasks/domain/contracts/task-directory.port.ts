import type { TaskViewer, TaskPerson } from '../types/task.types';
import type { PermissionScope } from '@arweqah-platform/shared';

/** What the task rules need to know about people and the organization (read-only). */
export abstract class TaskDirectory {
  /** An active employee with an account, or null (an account without an employee record cannot be given tasks). */
  abstract person(userId: string): Promise<TaskPerson | null>;
  abstract people(userIds: string[]): Promise<Map<string, TaskPerson>>;
  /** The employee record of a user (null for an account with none). */
  abstract employeeIdOf(userId: string): Promise<string | null>;
  /** The department the person works in (the nearest department at or above their unit) and its active manager, or null. */
  /** The employee's own unit and every unit above it (the units whose tags the person may use). */
  abstract unitsAbove(userId: string): Promise<string[]>;
  abstract departmentOf(userId: string): Promise<{ nodeId: string; managerUserId: string | null } | null>;
  /** People the viewer may give tasks to by scope (and `search` by name), at most 30, never the viewer. */
  abstract assignCandidates(viewer: TaskViewer, scope: PermissionScope | null, search?: string): Promise<TaskPerson[]>;
  /** Active employees of the company whose name matches `search`, at most 20 (for the @ list). */
  abstract mentionables(companyId: string, search?: string): Promise<{ userId: string; name: string }[]>;
}
