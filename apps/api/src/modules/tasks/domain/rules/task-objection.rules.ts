import type { TaskStatus } from '@arweqah-platform/shared';

export type ObjectionRefusal = 'NOT_ASSIGNEE' | 'OWN_TASK' | 'NOT_TODO' | 'ALREADY_OBJECTED' | 'ARCHIVED';

/**
 * Who may object, and when: the assignee of a task somebody else gave them, while it is still to do and nobody has objected yet.
 * Returns null when allowed, otherwise the reason it is not.
 */
export function objectionRefusal(input: { isAssignee: boolean; isCreator: boolean; status: TaskStatus; hasOpenObjection: boolean; archived: boolean }): ObjectionRefusal | null {
  if (input.archived) return 'ARCHIVED';
  if (!input.isAssignee) return 'NOT_ASSIGNEE';
  if (input.isCreator) return 'OWN_TASK';
  if (input.status !== 'todo') return 'NOT_TODO';
  return input.hasOpenObjection ? 'ALREADY_OBJECTED' : null;
}
