/** Audit action names of the notices module. Services use these constants, never inline strings; the audit never carries the text of a notice or a rejection reason. */
export const NOTICE_AUDIT = {
  created: 'notice.created',
  updated: 'notice.updated',
  deleted: 'notice.deleted',
  submitted: 'notice.submitted',
  approved: 'notice.approved',
  rejected: 'notice.rejected',
  published: 'notice.published',
  catchUp: 'notice.caught_up',
  acknowledged: 'notice.acknowledged',
  pinned: 'notice.pinned',
  unpinned: 'notice.unpinned',
  archived: 'notice.archived',
  revisionStarted: 'notice.revision_started',
  revisionCancelled: 'notice.revision_cancelled',
  writerAdded: 'notice.writer_added',
  writerRemoved: 'notice.writer_removed',
  channelCreated: 'notice.channel_created',
  channelRenamed: 'notice.channel_renamed',
  channelDisabled: 'notice.channel_disabled',
  channelEnabled: 'notice.channel_enabled',
  channelDeleted: 'notice.channel_deleted',
  settingsUpdated: 'notice.settings_updated',
  batchFailed: 'notice.batch_failed',
} as const;

/** The durable jobs and outbox messages: `publishDue` runs on the publish day, `deliverBatch` once per batch. */
export const NOTICE_TOPICS = { publishDue: 'notices.publish-due', deliverBatch: 'notices.deliver-batch' } as const;

export type NoticeNoticeKind = 'submitted' | 'approved' | 'rejected' | 'published' | 'updated' | 'withdrawn' | 'writerAdded' | 'writerRemoved' | 'batchFailed';
