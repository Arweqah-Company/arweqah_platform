import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import type { NoticeAudienceType, NoticeChannelCode, NoticeStatus, NoticeType } from '@arweqah-platform/shared';
import { BaseEntity } from '../../../../common/domain/base.entity';

/**
 * A publishing channel of a unit (FR-177): the unit is the one whose head manages its writers; each channel has the system role its writers hold (made with the channel).
 * The first two channels (human resources, corporate communications) are rows like any other.
 */
@Entity('notice_channels')
export class NoticeChannel extends BaseEntity {
  /** The stable slug made from the English name when the channel is created; never changed by a rename. */
  @Index('UQ_notice_channels_code', { unique: true })
  @Column({ type: 'varchar', length: 60 })
  code: NoticeChannelCode;

  @Index('UQ_notice_channels_name_ar', { unique: true })
  @Column({ name: 'name_ar', type: 'varchar', length: 120 })
  nameAr: string;

  @Index('UQ_notice_channels_name_en', { unique: true })
  @Column({ name: 'name_en', type: 'varchar', length: 120 })
  nameEn: string;

  /** The unit the channel belongs to (never changes); null = company-wide, managed by a platform administrator only. */
  @Index('IDX_notice_channels_org_node')
  @Column({ name: 'org_node_id', type: 'uuid', nullable: true })
  orgNodeId: string | null;

  @Column({ name: 'writer_role_id', type: 'uuid' })
  writerRoleId: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne('Role', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'writer_role_id', foreignKeyConstraintName: 'FK_notice_channels_role' })
  private readonly roleFk?: unknown;

  @ManyToOne('OrgNode', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'org_node_id', foreignKeyConstraintName: 'FK_notice_channels_org_node' })
  private readonly orgNodeFk?: unknown;
}

/** Who may write in a channel (membership; the writer's keys come from the channel's role). Who added a writer is in the audit log. */
@Entity('notice_channel_writers')
@Unique('UQ_notice_channel_writers', ['channelId', 'userId'])
export class NoticeChannelWriter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'channel_id', type: 'uuid' })
  channelId: string;

  @Index('IDX_notice_channel_writers_user')
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @CreateDateColumn({ name: 'added_at', type: 'timestamptz' })
  addedAt: Date;

  @ManyToOne('NoticeChannel', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id', foreignKeyConstraintName: 'FK_notice_channel_writers_channel' })
  private readonly channelFk?: unknown;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_notice_channel_writers_user' })
  private readonly userFk?: unknown;
}

/** A circular or a policy. The title and the text live in `notice_versions`; `revision` is the optimistic-lock counter of this row. */
@Entity('notices')
@Index('IDX_notices_status', ['status'])
@Index('IDX_notices_channel', ['channelId'])
@Index('IDX_notices_author', ['authorId'])
@Index('IDX_notices_author_unit', ['authorUnitId'])
@Index('UQ_notices_pinned', ['isPinned'], { unique: true, where: 'is_pinned = true' })
export class Notice extends BaseEntity {
  @Column({ name: 'channel_id', type: 'uuid' })
  channelId: string;

  @Column({ type: 'varchar', length: 15 })
  kind: NoticeType;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: NoticeStatus;

  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  /** The unit the author sat in when the notice was written (it decides who approves and which head sees it). */
  @Column({ name: 'author_unit_id', type: 'uuid', nullable: true })
  authorUnitId: string | null;

  /** Chosen when it is sent for approval; the person who approved or rejected afterwards. */
  @Column({ name: 'approver_user_id', type: 'uuid', nullable: true })
  approverUserId: string | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'reject_reason', type: 'text', nullable: true })
  rejectReason: string | null;

  /** The day it is published (Riyadh date); empty for a new version of a published notice, which is published as soon as it is approved. */
  @Column({ name: 'publish_on', type: 'date', nullable: true })
  publishOn: string | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ name: 'is_pinned', type: 'boolean', default: false })
  isPinned: boolean;

  @Column({ name: 'pinned_at', type: 'timestamptz', nullable: true })
  pinnedAt: Date | null;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt: Date | null;

  @Column({ type: 'int', default: 1 })
  revision: number;

  /** The highest version that was published; 0 until the first publication. The version being written is always the next one. */
  @Column({ name: 'current_version', type: 'int', default: 0 })
  currentVersion: number;

  /** How many delivery batches ran for the current version, and when the last one finished. */
  @Column({ name: 'batches_done', type: 'int', default: 0 })
  batchesDone: number;

  @Column({ name: 'delivery_completed_at', type: 'timestamptz', nullable: true })
  deliveryCompletedAt: Date | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  declare updatedAt: Date;

  @ManyToOne('NoticeChannel', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'channel_id', foreignKeyConstraintName: 'FK_notices_channel' })
  private readonly channelFk?: unknown;

  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'author_id', foreignKeyConstraintName: 'FK_notices_author' })
  private readonly authorFk?: unknown;

  @ManyToOne('OrgNode', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'author_unit_id', foreignKeyConstraintName: 'FK_notices_author_unit' })
  private readonly unitFk?: unknown;

  @ManyToOne('User', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'approver_user_id', foreignKeyConstraintName: 'FK_notices_approver' })
  private readonly approverFk?: unknown;
}

/** One version of the title and text. A published version never changes; the draft of a new version is removed when the change is cancelled. */
@Entity('notice_versions')
@Unique('UQ_notice_versions', ['noticeId', 'version'])
export class NoticeVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'notice_id', type: 'uuid' })
  noticeId: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ name: 'title_ar', type: 'varchar', length: 200 })
  titleAr: string;

  @Column({ name: 'title_en', type: 'varchar', length: 200, nullable: true })
  titleEn: string | null;

  /** Sanitized HTML. */
  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'is_draft', type: 'boolean', default: true })
  isDraft: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne('Notice', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notice_id', foreignKeyConstraintName: 'FK_notice_versions_notice' })
  private readonly noticeFk?: unknown;
}

/** One rule of who receives a version (rules, not people: the people are worked out when it is published). */
@Entity('notice_audiences')
@Index('IDX_notice_audiences_notice', ['noticeId', 'version'])
export class NoticeAudience {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'notice_id', type: 'uuid' })
  noticeId: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'varchar', length: 15 })
  type: NoticeAudienceType;

  /** The unit, job title or group of people; empty for `all`. */
  @Column({ name: 'ref_id', type: 'uuid', nullable: true })
  refId: string | null;

  @Column({ name: 'include_below', type: 'boolean', default: false })
  includeBelow: boolean;

  @ManyToOne('Notice', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notice_id', foreignKeyConstraintName: 'FK_notice_audiences_notice' })
  private readonly noticeFk?: unknown;
}

/** A person the notice reached, with what they did with it. */
@Entity('notice_recipients')
@Unique('UQ_notice_recipients', ['noticeId', 'userId'])
@Index('IDX_notice_recipients_user', ['userId', 'acknowledgedAt'])
export class NoticeRecipient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'notice_id', type: 'uuid' })
  noticeId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @CreateDateColumn({ name: 'delivered_at', type: 'timestamptz' })
  deliveredAt: Date;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @Column({ name: 'acknowledged_at', type: 'timestamptz', nullable: true })
  acknowledgedAt: Date | null;

  @Column({ name: 'acknowledged_version', type: 'int', nullable: true })
  acknowledgedVersion: number | null;

  /** Reached by the nightly pass after the publication (a new employee, a move, a new group member). */
  @Column({ name: 'joined_after_publish', type: 'boolean', default: false })
  joinedAfterPublish: boolean;

  /** The version the person was notified about (a delivery batch notifies those below the version it delivers, so a re-run never notifies twice). */
  @Column({ name: 'notified_version', type: 'int', default: 0 })
  notifiedVersion: number;

  @ManyToOne('Notice', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notice_id', foreignKeyConstraintName: 'FK_notice_recipients_notice' })
  private readonly noticeFk?: unknown;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_notice_recipients_user' })
  private readonly userFk?: unknown;
}

@Entity('notice_attachments')
@Index('IDX_notice_attachments_notice', ['noticeId', 'version'])
export class NoticeAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'notice_id', type: 'uuid' })
  noticeId: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ name: 'file_id', type: 'uuid' })
  fileId: string;

  @Column({ type: 'int', default: 0 })
  position: number;

  @ManyToOne('Notice', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notice_id', foreignKeyConstraintName: 'FK_notice_attachments_notice' })
  private readonly noticeFk?: unknown;

  @ManyToOne('StoredFile', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'file_id', foreignKeyConstraintName: 'FK_notice_attachments_file' })
  private readonly fileFk?: unknown;
}

/** One row (id 1): how many people each delivery batch reaches and the minutes between batches. */
@Entity('notice_settings')
export class NoticeSettings {
  @PrimaryColumn({ type: 'smallint' })
  id: number;

  @Column({ name: 'batch_size', type: 'int', default: 500 })
  batchSize: number;

  @Column({ name: 'batch_interval_minutes', type: 'int', default: 5 })
  batchIntervalMinutes: number;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne('User', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'updated_by', foreignKeyConstraintName: 'FK_notice_settings_user' })
  private readonly userFk?: unknown;
}

export const NOTICE_ENTITIES = [NoticeChannel, NoticeChannelWriter, Notice, NoticeVersion, NoticeAudience, NoticeRecipient, NoticeAttachment, NoticeSettings];
