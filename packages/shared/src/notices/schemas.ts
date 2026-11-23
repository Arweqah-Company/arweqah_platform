import { z } from 'zod';
import { paginationQuerySchema } from '../common/pagination';

// ------------------------------------------------------------------ vocabulary

export const NOTICE_STATUSES = ['draft', 'pending_approval', 'rejected', 'approved', 'published', 'revising', 'archived'] as const;
export type NoticeStatus = (typeof NOTICE_STATUSES)[number];

/** An announcement is read; a policy must be acknowledged. */
export const NOTICE_TYPES = ['announcement', 'policy'] as const;
export type NoticeType = (typeof NOTICE_TYPES)[number];

/**
 * A publishing channel's code: a stable slug made from its English name when it is created (`hr`, `corporate_comms`, `legal_affairs`). Channels belong to units and are
 * added at any time (FR-177), so there is no fixed list.
 */
export type NoticeChannelCode = string;
export const noticeChannelCodeSchema = z.string().regex(/^[a-z0-9][a-z0-9_]{0,59}$/, 'invalid channel code');

export const NOTICE_AUDIENCE_TYPES = ['all', 'unit', 'title', 'people_group'] as const;
export type NoticeAudienceType = (typeof NOTICE_AUDIENCE_TYPES)[number];

/** What the person with a notice has done with it: still has to acknowledge, acknowledged, or it only informs. */
export const NOTICE_MY_STATES = ['await', 'done', 'info'] as const;
export type NoticeMyState = (typeof NOTICE_MY_STATES)[number];

export const NOTICE_MINE_TABS = ['all', 'await', 'done', 'info'] as const;
export type NoticeMineTab = (typeof NOTICE_MINE_TABS)[number];

export const NOTICE_MANAGE_TABS = ['all', 'mine', 'pending', 'published', 'archived'] as const;
export type NoticeManageTab = (typeof NOTICE_MANAGE_TABS)[number];

/** The «state» filter of the manage list: the stored statuses, `scheduled` (approved, waiting for its day) and `revising` (hidden while a new version is written or reviewed). */
export const NOTICE_MANAGE_STATES = ['draft', 'pending_approval', 'scheduled', 'published', 'revising', 'rejected', 'archived'] as const;
export type NoticeManageState = (typeof NOTICE_MANAGE_STATES)[number];

export const NOTICE_ACK_RATE_BANDS = ['below_50', 'from_50', 'complete'] as const;
export type NoticeAckRateBand = (typeof NOTICE_ACK_RATE_BANDS)[number];

/** Who has acknowledged: the current version, an older one only, not yet, or joined the audience after the publication. */
export const NOTICE_ACK_STATES = ['acknowledged', 'older_version', 'pending', 'joined_later'] as const;
export type NoticeAckState = (typeof NOTICE_ACK_STATES)[number];

export const NOTICE_SORT_KEYS = ['publishedAt', 'publishOn', 'title', 'status', 'createdAt'] as const;
export type NoticeSortKey = (typeof NOTICE_SORT_KEYS)[number];

export const NOTICE_TIMELINE_EVENTS = ['created', 'submitted', 'approved', 'rejected', 'published', 'revision_started', 'revision_cancelled', 'archived', 'edited'] as const;
export type NoticeTimelineEvent = (typeof NOTICE_TIMELINE_EVENTS)[number];

// ------------------------------------------------------------------ limits

export const NOTICE_LIMITS = {
  titleMax: 200,
  /** A channel's name (the writer role's name, «Notice writer — …», must fit the 120 of a role's name). */
  channelNameMax: 90,
  bodyMax: 20_000,
  rejectReasonMin: 5,
  rejectReasonMax: 1000,
  files: 5,
  audienceRules: 200,
  batchSize: { min: 1, max: 5000, default: 500 },
  batchIntervalMinutes: { min: 1, max: 60, default: 5 },
  /** The most rows of an acknowledgement report a screen exports (it reads pages of the same endpoint). */
  exportRows: 10_000,
} as const;

// ------------------------------------------------------------------ inputs

const optionalBoolean = z.enum(['true', 'false']).transform((v) => v === 'true').optional();
const text = (max: number) => z.string().trim().max(max);

/** One rule of the audience; rules are summed (a person matching any of them receives the notice). `all` stands alone. */
export const noticeAudienceRuleSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('all') }),
  z.strictObject({ type: z.literal('unit'), refId: z.uuid(), includeBelow: z.boolean().default(true) }),
  z.strictObject({ type: z.literal('title'), refId: z.uuid() }),
  z.strictObject({ type: z.literal('people_group'), refId: z.uuid() }),
]);
export type NoticeAudienceRuleInput = z.input<typeof noticeAudienceRuleSchema>;
export type NoticeAudienceRule = z.output<typeof noticeAudienceRuleSchema>;

export const noticeAudienceSchema = z.array(noticeAudienceRuleSchema).max(NOTICE_LIMITS.audienceRules);

const noticeContent = {
  channelCode: noticeChannelCodeSchema,
  kind: z.enum(NOTICE_TYPES),
  titleAr: text(NOTICE_LIMITS.titleMax).min(1),
  titleEn: text(NOTICE_LIMITS.titleMax).nullable().optional(),
  /** Formatted text, sanitized by the API (a white list of tags; no script, style, image or event attribute survives). */
  body: text(NOTICE_LIMITS.bodyMax).min(1),
  audience: noticeAudienceSchema.default([]),
  fileIds: z.array(z.uuid()).max(NOTICE_LIMITS.files).default([]),
};

/** ISO date, today (Riyadh) or later; checked by the API. */
export const createNoticeSchema = z.strictObject({ ...noticeContent, publishOn: z.iso.date() });
export type CreateNoticeInput = z.infer<typeof createNoticeSchema>;

/** Editing a draft or a rejected notice replaces its content; a new version of a published notice has no publish date (it is published as soon as it is approved). */
export const updateNoticeSchema = z.strictObject({ ...noticeContent, publishOn: z.iso.date().optional(), revision: z.number().int().min(0).optional() });
export type UpdateNoticeInput = z.infer<typeof updateNoticeSchema>;

/** The write endpoints that only move the notice on; `revision` (optional) makes the call fail with 409 when somebody changed the notice first. */
export const noticeActionSchema = z.strictObject({ revision: z.number().int().min(0).optional() });
export type NoticeActionInput = z.infer<typeof noticeActionSchema>;

export const rejectNoticeSchema = z.strictObject({
  reason: text(NOTICE_LIMITS.rejectReasonMax).min(NOTICE_LIMITS.rejectReasonMin),
  revision: z.number().int().min(0).optional(),
});
export type RejectNoticeInput = z.infer<typeof rejectNoticeSchema>;

export const noticeAudienceCountSchema = z.strictObject({ audience: noticeAudienceSchema });
export type NoticeAudienceCountInput = z.infer<typeof noticeAudienceCountSchema>;

const dates = { from: z.iso.date().optional(), until: z.iso.date().optional() };

/** «My notices»: everything filters in the query (search runs on the title and the text). */
export const noticeMineQuerySchema = paginationQuerySchema.extend({
  tab: z.enum(NOTICE_MINE_TABS).default('all'),
  channelCode: noticeChannelCodeSchema.optional(),
  kind: z.enum(NOTICE_TYPES).optional(),
  myState: z.enum(NOTICE_MY_STATES).optional(),
  publishedFrom: dates.from,
  publishedUntil: dates.until,
  pinned: optionalBoolean,
});
export type NoticeMineQuery = z.infer<typeof noticeMineQuerySchema>;

/** The manage list: search runs on the titles (both languages), the text and the author's name. */
export const noticeManageQuerySchema = paginationQuerySchema.extend({
  tab: z.enum(NOTICE_MANAGE_TABS).default('all'),
  channelCode: noticeChannelCodeSchema.optional(),
  kind: z.enum(NOTICE_TYPES).optional(),
  state: z.enum(NOTICE_MANAGE_STATES).optional(),
  authorId: z.uuid().optional(),
  /** The unit of the author, with the units below it. */
  unitId: z.uuid().optional(),
  publishedFrom: dates.from,
  publishedUntil: dates.until,
  pinned: optionalBoolean,
  ackRate: z.enum(NOTICE_ACK_RATE_BANDS).optional(),
  sort: z.enum(NOTICE_SORT_KEYS).default('createdAt'),
  dir: z.enum(['asc', 'desc']).default('desc'),
});
export type NoticeManageQuery = z.infer<typeof noticeManageQuerySchema>;

/** Waiting for my approval. */
export const noticeApprovalsQuerySchema = paginationQuerySchema.extend({
  channelCode: noticeChannelCodeSchema.optional(),
  kind: z.enum(NOTICE_TYPES).optional(),
  authorId: z.uuid().optional(),
  submittedFrom: dates.from,
  submittedUntil: dates.until,
});
export type NoticeApprovalsQuery = z.infer<typeof noticeApprovalsQuerySchema>;

export const noticeAcknowledgementsQuerySchema = paginationQuerySchema.extend({
  state: z.enum(NOTICE_ACK_STATES).optional(),
  unitId: z.uuid().optional(),
});
export type NoticeAcknowledgementsQuery = z.infer<typeof noticeAcknowledgementsQuerySchema>;

/** The choices of the audience picker; `search` narrows them by name (unit, title or group). */
export const noticeAudienceOptionsQuerySchema = z.strictObject({ search: text(100).optional() });
export type NoticeAudienceOptionsQuery = z.infer<typeof noticeAudienceOptionsQuerySchema>;

export const noticeCandidatesQuerySchema = z.strictObject({ search: text(100).optional() });
export type NoticeCandidatesQuery = z.infer<typeof noticeCandidatesQuerySchema>;

export const noticeWritersQuerySchema = z.strictObject({ search: text(100).optional(), unitId: z.uuid().optional() });
export type NoticeWritersQuery = z.infer<typeof noticeWritersQuerySchema>;

/** Adding a writer: only the employee; who added him and why is in the audit log. */
export const addNoticeWriterSchema = z.strictObject({ employeeId: z.uuid(), note: text(300).optional() });
export type AddNoticeWriterInput = z.infer<typeof addNoticeWriterSchema>;

export const noticeSettingsSchema = z.strictObject({
  batchSize: z.number().int().min(NOTICE_LIMITS.batchSize.min).max(NOTICE_LIMITS.batchSize.max),
  batchIntervalMinutes: z.number().int().min(NOTICE_LIMITS.batchIntervalMinutes.min).max(NOTICE_LIMITS.batchIntervalMinutes.max),
});
export type NoticeSettingsInput = z.infer<typeof noticeSettingsSchema>;

export const noticeChannelCodeParamSchema = z.strictObject({ code: noticeChannelCodeSchema });
export const noticeWriterParamSchema = z.strictObject({ code: noticeChannelCodeSchema, userId: z.uuid() });
export const noticeAttachmentParamSchema = z.strictObject({ id: z.uuid(), fileId: z.uuid() });

// ------------------------------------------------------------------ channels of units (FR-177)

const channelName = z.string().trim().min(1).max(NOTICE_LIMITS.channelNameMax);

/** A channel is made for a unit; the unit never changes afterwards. */
export const createNoticeChannelSchema = z.strictObject({ nameAr: channelName, nameEn: channelName, unitId: z.uuid() });
export type CreateNoticeChannelInput = z.infer<typeof createNoticeChannelSchema>;

export const renameNoticeChannelSchema = z.strictObject({ nameAr: channelName, nameEn: channelName });
export type RenameNoticeChannelInput = z.infer<typeof renameNoticeChannelSchema>;

/** The units a person may make a channel for (the reach of `notices.channel_add`), narrowed by name. */
export const noticeChannelUnitsQuerySchema = z.strictObject({ search: text(100).optional() });
export type NoticeChannelUnitsQuery = z.infer<typeof noticeChannelUnitsQuerySchema>;

/** The code of every error the module answers with (the screen translates them). */
export const NOTICE_ERROR_CODES = [
  'NOTICE_NOT_CHANNEL_WRITER',
  'NOTICE_NOT_AUTHOR',
  'NOTICE_NOT_EDITABLE',
  'NOTICE_NOT_DRAFT',
  'NOTICE_SELF_APPROVAL',
  'NOTICE_NOT_PENDING',
  'NOTICE_NOT_PUBLISHED',
  'NOTICE_NOT_REVISING',
  'NOTICE_ARCHIVED',
  'NOTICE_NO_ACK_REQUIRED',
  'NOTICE_ACK_IMPERSONATION',
  'NOTICE_REVISION_CONFLICT',
  'NOTICE_PUBLISH_DATE_REQUIRED',
  'NOTICE_PUBLISH_DATE_PAST',
  'NOTICE_AUDIENCE_EMPTY',
  'NOTICE_AUDIENCE_INVALID',
  'NOTICE_BODY_EMPTY',
  'NOTICE_FILES_INVALID',
  'NOTICE_WRITER_EXISTS',
  'NOTICE_WRITER_INACTIVE',
  'NOTICE_WRITER_NO_ACCOUNT',
  'NOTICE_CHANNEL_DISABLED',
  'NOTICE_CHANNEL_HAS_NOTICES',
  'NOTICE_CHANNEL_NAME_EXISTS',
  'NOTICE_BATCH_FAILED',
] as const;
export type NoticeErrorCode = (typeof NOTICE_ERROR_CODES)[number];
