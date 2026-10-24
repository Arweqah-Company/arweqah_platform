import type { TaskDto, TaskListItemDto } from '@arweqah-platform/shared';

/** A task as the list API returns it; tests change what they care about. */
export const taskItem = (over: Partial<TaskListItemDto> = {}): TaskListItemDto => ({
  id: 't1',
  number: 'TSK-000001',
  title: 'إعداد تقرير المبيعات',
  status: 'todo',
  priority: 'medium',
  dueDate: '2026-11-10',
  estimateMinutes: 90,
  assignee: { id: 'u1', name: 'سارة أحمد' },
  creator: { id: 'u2', name: 'منى خالد' },
  tag: null,
  flags: { urgent: false, overdue: false, stale: false, objected: false },
  needsReview: false,
  source: 'standalone',
  archivedAt: null,
  revision: 1,
  ...over,
});

export const taskPage = (items: TaskListItemDto[]) => ({ items, total: items.length, page: 1, pageSize: 20, groupBy: null });

/** A task with its detail; abilities start closed. */
export const taskDetail = (over: Partial<TaskDto> = {}): TaskDto => ({
  ...taskItem(),
  description: 'تفاصيل المهمة',
  urgentMarked: false,
  reviewer: null,
  approver: null,
  recurrence: 'none',
  recurrenceEnd: null,
  completedAt: null,
  loggedMinutes: 30,
  isFollowing: false,
  followers: 0,
  objection: null,
  events: [{ id: 'e1', type: 'created', actor: { id: 'u2', name: 'منى خالد' }, fromStatus: null, toStatus: 'todo', note: null, createdAt: '2026-11-01T08:00:00.000Z' }],
  abilities: { moveTo: [], edit: false, approve: false, object: false, answerObjection: false, resubmit: false, follow: false, logTime: false, restore: false },
  ...over,
});
