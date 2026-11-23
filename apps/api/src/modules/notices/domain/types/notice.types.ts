import type { NoticeAckState, NoticeAckRateBand, NoticeChannelCode, NoticeManageState, NoticeManageTab, NoticeMineTab, NoticeMyState, NoticeSortKey, NoticeStatus, NoticeType, Paginated } from '@arweqah-platform/shared';
import type { ScopeFilter } from '../../../../core/access/domain/access-context';
import type { PeopleScope } from '../contracts/notice-channel.repository';
import type { Notice } from '../entities/notice.entities';

/** A notice with where its author's unit sits (for the scope checks of records the person did not write). */
export type NoticeRecord = Notice & { unitCompanyId: string | null };

/** What the access checks need to know about a notice (a full record or a row of a list). */
export interface NoticeFacts {
  status: NoticeStatus;
  authorId: string;
  authorUnitId: string | null;
  unitCompanyId: string | null;
  channelId: string;
  publishedAt: Date | null;
  isPinned: boolean;
}

export interface NewNotice {
  channelId: string;
  kind: NoticeType;
  authorId: string;
  authorUnitId: string | null;
  publishOn: string | null;
}

/** What a repository may change in one write; the revision counter is bumped by the repository. */
export type NoticePatch = Partial<
  Pick<Notice, 'channelId' | 'kind' | 'status' | 'approverUserId' | 'submittedAt' | 'approvedAt' | 'rejectReason' | 'publishOn' | 'publishedAt' | 'isPinned' | 'pinnedAt' | 'archivedAt' | 'currentVersion' | 'batchesDone' | 'deliveryCompletedAt'>
>;

export interface VersionContent {
  titleAr: string;
  titleEn: string | null;
  body: string;
}

export interface AudienceRuleRow {
  type: string;
  refId: string | null;
  includeBelow: boolean;
}

export interface AttachmentRow {
  fileId: string;
  originalName: string;
  contentType: string;
  size: number;
  createdAt: Date;
}

/** One row of the manage list, the approvals list and the details header. */
export interface NoticeListRow extends NoticeFacts {
  id: string;
  channelCode: NoticeChannelCode;
  channelNameAr: string;
  channelNameEn: string;
  kind: NoticeType;
  status: NoticeStatus;
  authorId: string;
  authorName: string;
  authorUnitId: string | null;
  unitNameAr: string | null;
  unitNameEn: string | null;
  publishOn: string | null;
  publishedAt: Date | null;
  submittedAt: Date | null;
  createdAt: Date;
  isPinned: boolean;
  currentVersion: number;
  revision: number;
  version: number;
  titleAr: string;
  titleEn: string | null;
  audienceAll: boolean;
  audienceRules: number;
  recipients: number;
  acknowledged: number;
}

/** A row of «my notices» (the text only for the details). */
export interface MineRow {
  id: string;
  channelCode: NoticeChannelCode;
  channelNameAr: string;
  channelNameEn: string;
  kind: NoticeType;
  status: NoticeStatus;
  titleAr: string;
  titleEn: string | null;
  body: string;
  publishedAt: Date;
  isPinned: boolean;
  version: number;
  readAt: Date | null;
  acknowledgedAt: Date | null;
  acknowledgedVersion: number | null;
}

export interface AckRow {
  userId: string;
  name: string;
  unitId: string | null;
  unitNameAr: string | null;
  unitNameEn: string | null;
  deliveredAt: Date;
  acknowledgedAt: Date | null;
  acknowledgedVersion: number | null;
  joinedAfterPublish: boolean;
}

export interface AckSummary {
  reached: number;
  acknowledged: number;
}

/** The viewer of the manage and approval lists: who they are and how far each key reaches. */
export interface NoticeListViewer {
  userId: string;
  scope: ScopeFilter;
  /** The channels the person writes in (what «own» reaches). */
  writerChannelIds: string[];
}

export interface ManageListFilters {
  viewer: NoticeListViewer;
  tab: NoticeManageTab;
  channelCode?: NoticeChannelCode;
  kind?: NoticeType;
  state?: NoticeManageState;
  authorId?: string;
  unitId?: string;
  publishedFrom?: string;
  publishedUntil?: string;
  pinned?: boolean;
  ackRate?: NoticeAckRateBand;
  search?: string;
  sort: NoticeSortKey;
  dir: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface ApprovalsListFilters {
  viewer: NoticeListViewer;
  channelCode?: NoticeChannelCode;
  kind?: NoticeType;
  authorId?: string;
  submittedFrom?: string;
  submittedUntil?: string;
  search?: string;
  page: number;
  pageSize: number;
}

export interface MineListFilters {
  userId: string;
  tab: NoticeMineTab;
  channelCode?: NoticeChannelCode;
  kind?: NoticeType;
  myState?: NoticeMyState;
  publishedFrom?: string;
  publishedUntil?: string;
  pinned?: boolean;
  search?: string;
  page: number;
  pageSize: number;
}

export interface AckFilters {
  noticeId: string;
  currentVersion: number;
  /** `null` = every recipient; otherwise only the people the scope reaches (by the unit they sit in). */
  unitScope: PeopleScope | null;
  state?: NoticeAckState;
  unitId?: string;
  search?: string;
  page: number;
  pageSize: number;
}

export type ManagePage = Paginated<NoticeListRow>;

export interface PersonRow {
  id: string;
  name: string;
}

export interface WriterRow {
  userId: string;
  employeeId: string | null;
  name: string;
  jobTitleAr: string | null;
  jobTitleEn: string | null;
  unitId: string | null;
  unitNameAr: string | null;
  unitNameEn: string | null;
  orgNodeId: string | null;
  companyId: string | null;
  addedAt: Date;
  drafts: number;
  pendingApproval: number;
}

export interface CandidateRow {
  employeeId: string;
  userId: string;
  name: string;
  jobTitleAr: string | null;
  jobTitleEn: string | null;
  unitId: string | null;
  unitNameAr: string | null;
  unitNameEn: string | null;
  hasNoApprover: boolean;
}

/** An employee a writer may be made from. */
export interface EmployeeFacts {
  employeeId: string;
  userId: string | null;
  isActive: boolean;
  name: string;
  orgNodeId: string | null;
  companyId: string;
}

export interface UnitPlace {
  orgNodeId: string | null;
  companyId: string | null;
}

export interface FlowRow {
  event: string;
  actorId: string | null;
  comment: string | null;
  createdAt: Date;
}

/** A publishing channel with what the channels page shows about it. */
export interface ChannelRow {
  id: string;
  code: NoticeChannelCode;
  nameAr: string;
  nameEn: string;
  unitId: string | null;
  unitNameAr: string | null;
  unitNameEn: string | null;
  /** The company of the unit (what a scope that is limited to one company is checked against). */
  unitCompanyId: string | null;
  isActive: boolean;
  writerRoleId: string;
  writersCount: number;
  noticesCount: number;
  updatedAt: Date;
}

/** A unit a channel may be made for. */
export interface UnitOption {
  id: string;
  parentId: string | null;
  nameAr: string;
  nameEn: string;
  companyId: string;
}

/** What is known about a unit before a channel is made for it (null = not there). */
export type UnitFacts = Pick<UnitOption, 'id' | 'companyId'>;

export interface NewChannel {
  code: NoticeChannelCode;
  nameAr: string;
  nameEn: string;
  unitId: string;
  roleNameAr: string;
  roleNameEn: string;
}
