import type { FileDto } from '../files/schemas';
import type { Paginated } from '../common/pagination';
import type {
  NoticeAckState,
  NoticeAudienceType,
  NoticeChannelCode,
  NoticeType,
  NoticeMyState,
  NoticeStatus,
  NoticeTimelineEvent,
} from './schemas';

export interface NoticePersonRefDto {
  id: string;
  name: string;
}

export interface NoticeUnitRefDto {
  id: string;
  nameAr: string;
  nameEn: string;
}

export interface NoticeChannelRefDto {
  code: NoticeChannelCode;
  nameAr: string;
  nameEn: string;
  /** A disabled channel keeps its notices (the filters list it) but nobody writes in it. */
  isActive?: boolean;
}

/** What the signed-in person may do with a notice right now (the icons of the row). */
export interface NoticeAbilitiesDto {
  edit: boolean;
  submit: boolean;
  delete: boolean;
  pin: boolean;
  unpin: boolean;
  archive: boolean;
  revise: boolean;
  reviseCancel: boolean;
  approve: boolean;
  reject: boolean;
}

export interface NoticeAudienceRuleDto {
  type: NoticeAudienceType;
  refId: string | null;
  includeBelow: boolean;
  /** The unit, title or group named by the rule (null for `all`). */
  nameAr: string | null;
  nameEn: string | null;
}

export interface NoticeAckProgressDto {
  acknowledged: number;
  total: number;
  /** 0 to 100, rounded down. */
  percent: number;
}

/** A row of the manage list and of «waiting for my approval». */
export interface NoticeListItemDto {
  id: string;
  channel: NoticeChannelRefDto;
  kind: NoticeType;
  status: NoticeStatus;
  /** The version shown: the one being written or reviewed while there is one, else the published one. */
  version: number;
  titleAr: string;
  titleEn: string | null;
  author: NoticePersonRefDto;
  authorUnit: NoticeUnitRefDto | null;
  publishOn: string | null;
  publishedAt: string | null;
  submittedAt: string | null;
  createdAt: string;
  isPinned: boolean;
  /** A published notice with a new version being written, waiting for approval or rejected: employees do not see it. */
  hiddenForRevision: boolean;
  audience: { all: boolean; rules: number; recipients: number | null };
  /** Null for what is not a published policy. */
  ack: NoticeAckProgressDto | null;
  abilities: NoticeAbilitiesDto;
}

export interface NoticeVersionDto {
  version: number;
  isDraft: boolean;
  titleAr: string;
  titleEn: string | null;
  /** Sanitized HTML. */
  body: string;
  files: FileDto[];
  audience: NoticeAudienceRuleDto[];
  createdAt: string;
}

export interface NoticeDetailsDto extends NoticeListItemDto {
  /** The version being shown (see `version`), as the people will read it. */
  body: string;
  files: FileDto[];
  audienceRules: NoticeAudienceRuleDto[];
  rejectReason: string | null;
  approver: NoticePersonRefDto | null;
  /** Every version: the published one and, when there is one, the new version waiting. */
  versions: NoticeVersionDto[];
  /** Whether the person may open the acknowledgement report of this notice. */
  canSeeAcknowledgements: boolean;
  /** The row version of the notice: send it back as `revision` to make a write fail when somebody changed the notice first. */
  revision: number;
}

export type NoticesPageDto = Paginated<NoticeListItemDto> & {
  /** The size of each tab of the manage list, for the counters. */
  counts: { mine: number; pending: number };
};

export interface NoticeFlowStepDto {
  event: NoticeTimelineEvent;
  at: string;
  actor: NoticePersonRefDto | null;
  /** Only the rejection carries one. */
  reason: string | null;
  version: number | null;
}

export interface NoticeFlowDto {
  steps: NoticeFlowStepDto[];
  approver: NoticePersonRefDto | null;
  approverUnit: NoticeUnitRefDto | null;
  delivery: { batchesDone: number; recipients: number; completed: boolean };
  ack: NoticeAckProgressDto | null;
}

export interface NoticeAudienceReportDto {
  rules: NoticeAudienceRuleDto[];
  /** People the notice reached (after the publication, the ones it reached). */
  recipients: number;
  joinedAfterPublish: number;
}

export interface NoticeAudienceUnitOptionDto {
  id: string;
  parentId: string | null;
  nameAr: string;
  nameEn: string;
}

export interface NoticeAudienceTitleOptionDto {
  id: string;
  nameAr: string;
  nameEn: string;
  unitNameAr: string;
  unitNameEn: string;
}

export interface NoticeAudienceGroupOptionDto {
  id: string;
  nameAr: string;
  nameEn: string;
  memberCount: number;
}

/** What a writer may aim a notice at, whatever the writer's own reach: the active units, the job titles and the groups of people. */
export interface NoticeAudienceOptionsDto {
  units: NoticeAudienceUnitOptionDto[];
  titles: NoticeAudienceTitleOptionDto[];
  groups: NoticeAudienceGroupOptionDto[];
}

export interface NoticeAudienceCountDto {
  count: number;
}

export interface NoticeAcknowledgementRowDto {
  userId: string;
  name: string;
  unit: NoticeUnitRefDto | null;
  deliveredAt: string;
  acknowledgedAt: string | null;
  acknowledgedVersion: number | null;
  state: NoticeAckState;
}

export type NoticeAcknowledgementsDto = Paginated<NoticeAcknowledgementRowDto> & {
  /** Reached, acknowledged the current version, and not yet: the three tiles (inside the person's reach). */
  summary: { reached: number; acknowledged: number; pending: number };
};

/** A row of «my notices» and the cards of the home page. */
export interface NoticeMineItemDto {
  id: string;
  channel: NoticeChannelRefDto;
  kind: NoticeType;
  titleAr: string;
  titleEn: string | null;
  /** A two-line excerpt of the text, without formatting. */
  excerpt: string;
  publishedAt: string;
  isPinned: boolean;
  isArchived: boolean;
  version: number;
  myState: NoticeMyState;
  readAt: string | null;
  acknowledgedAt: string | null;
  /** The person acknowledged an older version and must acknowledge the new one. */
  acknowledgedOlderVersion: boolean;
}

export type NoticeMinePageDto = Paginated<NoticeMineItemDto> & { counts: { await: number } };

export interface NoticeMineDetailsDto extends NoticeMineItemDto {
  body: string;
  files: FileDto[];
}

export interface NoticeHomeDto {
  /** Policies waiting for the person's acknowledgement. */
  awaiting: number;
  newThisWeek: number;
  /** Null when the person holds no `notices.approve_view`. */
  pendingApproval: number | null;
  /** Null when the person holds no `notices.create`. */
  drafts: number | null;
  pinned: NoticeMineItemDto | null;
  /** The newest three policies waiting. */
  awaitingTop: NoticeMineItemDto[];
}

export interface NoticeFilterOptionsDto {
  /** Every channel (a disabled one keeps its notices, so the filters list it). */
  channels: NoticeChannelRefDto[];
  /** The enabled channels the person writes in: the choice of the form. */
  writableChannelCodes: NoticeChannelCode[];
  authors: NoticePersonRefDto[];
}

// ------------------------------------------------------------------ channels (publishing channels page)

export interface NoticeWriterDto {
  userId: string;
  employeeId: string | null;
  name: string;
  jobTitle: { nameAr: string; nameEn: string } | null;
  unit: NoticeUnitRefDto | null;
  addedAt: string;
  canRemove: boolean;
  /** What would stay behind if the writer were removed: the drafts and the notices waiting for approval (the confirm window says so). */
  drafts: number;
  pendingApproval: number;
}

export interface NoticeChannelDto {
  id: string;
  code: NoticeChannelCode;
  nameAr: string;
  nameEn: string;
  /** The unit the channel belongs to; null for a company-wide channel (only a platform administrator manages it). */
  unit: NoticeUnitRefDto | null;
  isActive: boolean;
  /** The role the writers of the channel hold. */
  writerRoleId: string;
  /** Every writer of the channel (whoever manages the channel sees them all). */
  writersCount: number;
  noticesCount: number;
  updatedAt: string;
  /** The keys of the person, each checked against the channel's unit. */
  canAddWriter: boolean;
  canRemoveWriter: boolean;
  canRename: boolean;
  /** Disable or enable. */
  canToggle: boolean;
  /** Delete: the key reaches the unit and the channel never had a notice. */
  canDelete: boolean;
  writers: NoticeWriterDto[];
}

export interface NoticeSettingsDto {
  batchSize: number;
  batchIntervalMinutes: number;
  /** Whether the person may change them. */
  canEdit: boolean;
}

export interface NoticeChannelsDto {
  channels: NoticeChannelDto[];
  settings: NoticeSettingsDto | null;
  /** Whether the person may make a channel (`notices.channel_add`). */
  canCreate: boolean;
}

export interface NoticeWriterCandidateDto {
  employeeId: string;
  userId: string;
  name: string;
  jobTitle: { nameAr: string; nameEn: string } | null;
  unit: NoticeUnitRefDto | null;
  /** Without a head above them, a platform administrator approves their notices (the screen warns). */
  hasNoApprover: boolean;
}
