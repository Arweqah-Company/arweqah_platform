import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';

/** A company's tag for tasks, kept by a department (an organization node). */
@Entity('task_tags')
export class TaskTag extends BaseEntity {
  @Index('IDX_task_tags_node')
  @Column({ name: 'org_node_id', type: 'uuid' })
  orgNodeId: string;

  @Column({ name: 'name_ar', type: 'varchar', length: 120 })
  nameAr: string;

  @Column({ name: 'name_en', type: 'varchar', length: 120 })
  nameEn: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne('OrgNode', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_node_id', foreignKeyConstraintName: 'FK_task_tags_node' })
  private readonly nodeFk?: unknown;
}

/** The rules of tasks for one company: every number is editable and kept inside limits (see `TASK_POLICY_LIMITS`). */
@Entity('task_policies')
export class TaskPolicy {
  @PrimaryColumn({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'objection_working_days', type: 'int', default: 3 })
  objectionWorkingDays: number;

  @Column({ name: 'stale_days', type: 'int', default: 30 })
  staleDays: number;

  @Column({ name: 'backdate_days', type: 'int', default: 7 })
  backdateDays: number;

  @Column({ name: 'urgent_days', type: 'int', default: 2 })
  urgentDays: number;

  @Column({ name: 'reminder_days_before', type: 'int', default: 1 })
  reminderDaysBefore: number;

  /** 0 = Sunday. */
  @Column({ name: 'digest_weekday', type: 'int', default: 0 })
  digestWeekday: number;

  @Column({ name: 'standalone_retention_days', type: 'int', default: 30 })
  standaloneRetentionDays: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne('Company', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id', foreignKeyConstraintName: 'FK_task_policies_company' })
  private readonly companyFk?: unknown;
}

@Entity('tasks')
@Index('IDX_tasks_assignee_status', ['assigneeUserId', 'status'])
@Index('IDX_tasks_status_activity', ['status', 'lastActivityAt'])
export class Task extends BaseEntity {
  /** Human number shown as TSK-000123, from a database sequence. */
  @Index('UQ_tasks_number', { unique: true })
  @Column({ type: 'bigint', generated: 'increment' })
  number: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ name: 'assignee_user_id', type: 'uuid' })
  assigneeUserId: string;

  @Index('IDX_tasks_creator')
  @Column({ name: 'creator_user_id', type: 'uuid' })
  creatorUserId: string;

  /** Who accepts the work of a task that needs review. */
  @Column({ name: 'reviewer_user_id', type: 'uuid', nullable: true })
  reviewerUserId: string | null;

  /** Who must approve a self-assigned task while it waits. */
  @Column({ name: 'approver_user_id', type: 'uuid', nullable: true })
  approverUserId: string | null;

  /** `pending_approval` | `todo` | `in_progress` | `awaiting_review` | `done` | `rejected`. */
  @Column({ type: 'varchar', length: 20, default: 'todo' })
  status: string;

  /** `low` | `medium` | `high`. */
  @Column({ type: 'varchar', length: 10, default: 'medium' })
  priority: string;

  @Index('IDX_tasks_due')
  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;

  @Column({ name: 'estimate_minutes', type: 'int', nullable: true })
  estimateMinutes: number | null;

  @Column({ name: 'tag_id', type: 'uuid', nullable: true })
  tagId: string | null;

  /** Somebody marked it urgent by hand; the other reasons (due soon, overdue) are computed. */
  @Column({ name: 'urgent_manual', type: 'boolean', default: false })
  urgentManual: boolean;

  @Column({ name: 'needs_review', type: 'boolean', default: false })
  needsReview: boolean;

  /** `none` | `daily` | `weekly` | `monthly`. */
  @Column({ type: 'varchar', length: 10, default: 'none' })
  recurrence: string;

  @Column({ name: 'recurrence_end', type: 'date', nullable: true })
  recurrenceEnd: string | null;

  /** The task this one repeats (the first of its series). */
  @Column({ name: 'recurrence_parent_id', type: 'uuid', nullable: true })
  recurrenceParentId: string | null;

  /** `standalone` | `project` | `ticket`. */
  @Column({ type: 'varchar', length: 12, default: 'standalone' })
  source: string;

  /** No foreign key until the projects module exists. */
  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null;

  @Column({ name: 'ticket_id', type: 'uuid', nullable: true })
  ticketId: string | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  /** The real day the work ended (may be earlier than the day it was recorded). */
  @Column({ name: 'completed_on', type: 'date', nullable: true })
  completedOn: string | null;

  /** Every move resets it; a task quiet for the policy's days is stale. */
  @Column({ name: 'last_activity_at', type: 'timestamptz', default: () => 'now()' })
  lastActivityAt: Date;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt: Date | null;

  @Column({ name: 'reminded_at', type: 'timestamptz', nullable: true })
  remindedAt: Date | null;

  @Column({ name: 'overdue_notified_at', type: 'timestamptz', nullable: true })
  overdueNotifiedAt: Date | null;

  @Column({ name: 'estimate_notified_at', type: 'timestamptz', nullable: true })
  estimateNotifiedAt: Date | null;

  /** Optimistic concurrency: every change checks and bumps it. */
  @Column({ type: 'int', default: 1 })
  revision: number;

  @ManyToOne('Company')
  @JoinColumn({ name: 'company_id', foreignKeyConstraintName: 'FK_tasks_company' })
  private readonly companyFk?: unknown;

  @ManyToOne('User')
  @JoinColumn({ name: 'assignee_user_id', foreignKeyConstraintName: 'FK_tasks_assignee' })
  private readonly assigneeFk?: unknown;

  @ManyToOne('User')
  @JoinColumn({ name: 'creator_user_id', foreignKeyConstraintName: 'FK_tasks_creator' })
  private readonly creatorFk?: unknown;

  @ManyToOne('User', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewer_user_id', foreignKeyConstraintName: 'FK_tasks_reviewer' })
  private readonly reviewerFk?: unknown;

  @ManyToOne('User', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approver_user_id', foreignKeyConstraintName: 'FK_tasks_approver' })
  private readonly approverFk?: unknown;

  @ManyToOne('TaskTag', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tag_id', foreignKeyConstraintName: 'FK_tasks_tag' })
  private readonly tagFk?: unknown;

  @ManyToOne('Task', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'recurrence_parent_id', foreignKeyConstraintName: 'FK_tasks_recurrence_parent' })
  private readonly parentFk?: unknown;

  @ManyToOne('Ticket', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ticket_id', foreignKeyConstraintName: 'FK_tasks_ticket' })
  private readonly ticketFk?: unknown;
}

/** The history of a task: who did what, when, and from which status to which. */
@Entity('task_events')
@Index('IDX_task_events_task', ['taskId', 'createdAt'])
export class TaskEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @Column({ type: 'varchar', length: 30 })
  type: string;

  /** Null for the system (a job, a hand-over). */
  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId: string | null;

  @Column({ name: 'from_status', type: 'varchar', length: 20, nullable: true })
  fromStatus: string | null;

  @Column({ name: 'to_status', type: 'varchar', length: 20, nullable: true })
  toStatus: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne('Task', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id', foreignKeyConstraintName: 'FK_task_events_task' })
  private readonly taskFk?: unknown;

  @ManyToOne('User', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_user_id', foreignKeyConstraintName: 'FK_task_events_actor' })
  private readonly actorFk?: unknown;
}

@Entity('task_followers')
export class TaskFollower {
  @PrimaryColumn({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne('Task', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id', foreignKeyConstraintName: 'FK_task_followers_task' })
  private readonly taskFk?: unknown;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_task_followers_user' })
  private readonly userFk?: unknown;
}

/** An objection to a task given to somebody. Unanswered, it lapses at `expires_at` and the task stays with its assignee. */
@Entity('task_objections')
@Index('IDX_task_objections_task', ['taskId', 'status'])
export class TaskObjection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @Column({ name: 'raised_by_user_id', type: 'uuid' })
  raisedByUserId: string;

  @Column({ name: 'reason_code', type: 'varchar', length: 30 })
  reasonCode: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  /** `open` | `expired` | `accepted` | `rejected`. */
  @Column({ type: 'varchar', length: 10, default: 'open' })
  status: string;

  @Column({ name: 'answered_by_user_id', type: 'uuid', nullable: true })
  answeredByUserId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne('Task', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id', foreignKeyConstraintName: 'FK_task_objections_task' })
  private readonly taskFk?: unknown;

  @ManyToOne('User')
  @JoinColumn({ name: 'raised_by_user_id', foreignKeyConstraintName: 'FK_task_objections_user' })
  private readonly userFk?: unknown;
}

@Entity('task_time_entries')
@Index('IDX_task_time_entries_task', ['taskId'])
export class TaskTimeEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'int' })
  minutes: number;

  @Column({ name: 'worked_on', type: 'date' })
  workedOn: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne('Task', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id', foreignKeyConstraintName: 'FK_task_time_entries_task' })
  private readonly taskFk?: unknown;

  @ManyToOne('User')
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_task_time_entries_user' })
  private readonly userFk?: unknown;
}

export const TASK_ENTITIES = [TaskTag, TaskPolicy, Task, TaskEvent, TaskFollower, TaskObjection, TaskTimeEntry];
