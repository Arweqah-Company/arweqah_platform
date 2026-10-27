import type { TaskStatus } from '@arweqah-platform/shared';

/** Audit action names of the tasks module. Services use these constants, never inline strings. */
export const TASK_AUDIT = {
  created: 'task.created',
  updated: 'task.updated',
  moved: 'task.moved',
  approved: 'task.approved',
  rejected: 'task.rejected',
  resubmitted: 'task.resubmitted',
  objected: 'task.objected',
  objectionAnswered: 'task.objection_answered',
  objectionExpired: 'task.objection_expired',
  archived: 'task.archived',
  handoverSkipped: 'task.handover_skipped',
  restored: 'task.restored',
  handedOver: 'task.handed_over',
  timeLogged: 'task.time_logged',
  tagCreated: 'task.tag.created',
  tagUpdated: 'task.tag.updated',
  tagRemoved: 'task.tag.removed',
  policyUpdated: 'task.policy.updated',
} as const;

export const TASK_TOPICS = {
  objectionExpiry: 'tasks.objection-expiry',
  handover: 'tasks.handover',
} as const;

export type TaskNoticeKind =
  | 'assigned'
  | 'statusChanged'
  | 'finished'
  | 'awaitingReview'
  | 'completionRejected'
  | 'approvalRequested'
  | 'approved'
  | 'approvalRejected'
  | 'objected'
  | 'objectionAnswered'
  | 'objectionExpired'
  | 'overdue'
  | 'estimateExceeded'
  | 'reminder'
  | 'digest'
  | 'handedOver'
  | 'handedOverMany'
  | 'reassigned'
  | 'archived'
  | 'restored';

/** Notices that also go out by e-mail: their text never carries the title (e-mail is not the place for it). */
export const EMAIL_NOTICES: ReadonlySet<TaskNoticeKind> = new Set<TaskNoticeKind>(['assigned', 'objected', 'completionRejected', 'awaitingReview', 'handedOver', 'handedOverMany']);

export const STATUS_NAMES: Record<TaskStatus, { ar: string; en: string }> = {
  pending_approval: { ar: 'بانتظار الاعتماد', en: 'Pending approval' },
  todo: { ar: 'للتنفيذ', en: 'To do' },
  in_progress: { ar: 'قيد التنفيذ', en: 'In progress' },
  awaiting_review: { ar: 'بانتظار المراجعة', en: 'Awaiting review' },
  done: { ar: 'مكتملة', en: 'Done' },
  rejected: { ar: 'مرفوضة', en: 'Rejected' },
};
