/**
 * Project membership for tasks. The projects module does not exist yet, so the adapter answers "nobody" until it is built;
 * then it tells who belongs to a project and who approves its tasks (see docs/plans/phase-3-tasks.md §1.1).
 */
export abstract class TaskProjectMembers {
  abstract isMember(userId: string, projectId: string): Promise<boolean>;
  /** The project manager who approves a project task after the direct manager, or null. */
  abstract approverOf(projectId: string): Promise<string | null>;
}
