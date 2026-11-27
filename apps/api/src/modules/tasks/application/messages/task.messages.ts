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
  followersAdded: 'task.followers_added',
  followerRemoved: 'task.follower_removed',
  handoverSkipped: 'task.handover_skipped',
  restored: 'task.restored',
  deleted: 'task.deleted',
  handedOver: 'task.handed_over',
  timeLogged: 'task.time_logged',
  filesAdded: 'task.files_added',
  deliveryAdded: 'task.delivery_added',
  fileRemoved: 'task.file_removed',
  tagCreated: 'task.tag.created',
  tagUpdated: 'task.tag.updated',
  tagRemoved: 'task.tag.removed',
  policyUpdated: 'task.policy.updated',
  commentAdded: 'task.comment_added',
  commentEdited: 'task.comment_edited',
  commentDeleted: 'task.comment_deleted',
  commentRulesChanged: 'task.comment_rules_changed',
  noticeSettingsUpdated: 'task.notice_settings_updated',
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
  | 'dueToday'
  | 'summary'
  | 'digest'
  | 'handedOver'
  | 'handedOverMany'
  | 'reassigned'
  | 'archived'
  | 'restored'
  | 'commentMentioned'
  | 'commentReplied'
  | 'commentAdded'
  | 'commentReacted'
  | 'followerAdded';

/** Notices the person chooses the channel of (in the app, by e-mail, both) and can switch off: the summary and the due-date reminders (FR-215…FR-218). */
export const CHOSEN_CHANNEL_NOTICES: ReadonlySet<TaskNoticeKind> = new Set<TaskNoticeKind>(['reminder', 'dueToday', 'overdue', 'summary']);

/** Notices that also go out by e-mail: their text never carries the title (e-mail is not the place for it). */
export const EMAIL_NOTICES: ReadonlySet<TaskNoticeKind> = new Set<TaskNoticeKind>(['assigned', 'objected', 'completionRejected', 'awaitingReview', 'handedOver', 'handedOverMany', 'commentMentioned']);

export const STATUS_NAMES: Record<TaskStatus, { ar: string; en: string }> = {
  pending_approval: { ar: 'بانتظار الاعتماد', en: 'Pending approval' },
  todo: { ar: 'للتنفيذ', en: 'To do' },
  in_progress: { ar: 'قيد التنفيذ', en: 'In progress' },
  awaiting_review: { ar: 'بانتظار المراجعة', en: 'Awaiting review' },
  done: { ar: 'مكتملة', en: 'Done' },
  rejected: { ar: 'مرفوضة', en: 'Rejected' },
};
