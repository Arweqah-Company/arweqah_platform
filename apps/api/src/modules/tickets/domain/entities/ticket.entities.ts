import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';

/** A department that receives tickets. The key is the organization node itself, so "desk id" and "department id" are the same value. */
@Entity('ticket_desks')
export class TicketDesk {
  @PrimaryColumn({ name: 'org_node_id', type: 'uuid' })
  orgNodeId: string;

  /** `active` receives tickets, `paused` is listed but disabled, `stopped` is not listed. */
  @Column({ name: 'reception_status', type: 'varchar', length: 10, default: 'stopped' })
  receptionStatus: string;

  @Column({ name: 'description_ar', type: 'text', nullable: true })
  descriptionAr: string | null;

  @Column({ name: 'description_en', type: 'text', nullable: true })
  descriptionEn: string | null;

  @Column({ name: 'accepts_personal', type: 'boolean', default: false })
  acceptsPersonal: boolean;

  /** Working days. */
  @Column({ name: 'default_due_days', type: 'int', default: 3 })
  defaultDueDays: number;

  /** Working days. */
  @Column({ name: 'min_lead_days', type: 'int', default: 0 })
  minLeadDays: number;

  /** The next four are calendar days. */
  @Column({ name: 'auto_close_days', type: 'int', default: 4 })
  autoCloseDays: number;

  @Column({ name: 'reopen_window_days', type: 'int', default: 7 })
  reopenWindowDays: number;

  @Column({ name: 'stale_after_days', type: 'int', default: 14 })
  staleAfterDays: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne('OrgNode', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_node_id', foreignKeyConstraintName: 'FK_ticket_desks_node' })
  private readonly nodeFk?: unknown;
}

@Entity('ticket_types')
export class TicketType extends BaseEntity {
  @Index('IDX_ticket_types_desk')
  @Column({ name: 'desk_id', type: 'uuid' })
  deskId: string;

  @Column({ name: 'name_ar', type: 'varchar', length: 120 })
  nameAr: string;

  @Column({ name: 'name_en', type: 'varchar', length: 120 })
  nameEn: string;

  @Column({ name: 'description_ar', type: 'text', nullable: true })
  descriptionAr: string | null;

  @Column({ name: 'description_en', type: 'text', nullable: true })
  descriptionEn: string | null;

  @Column({ name: 'default_assignee_user_id', type: 'uuid', nullable: true })
  defaultAssigneeUserId: string | null;

  /** Working days; null = the desk's default. */
  @Column({ name: 'due_days', type: 'int', nullable: true })
  dueDays: number | null;

  @Column({ name: 'is_personal', type: 'boolean', default: false })
  isPersonal: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @ManyToOne('TicketDesk', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'desk_id', foreignKeyConstraintName: 'FK_ticket_types_desk' })
  private readonly deskFk?: unknown;

  @ManyToOne('User', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'default_assignee_user_id', foreignKeyConstraintName: 'FK_ticket_types_assignee' })
  private readonly assigneeFk?: unknown;
}

@Entity('tickets')
export class Ticket extends BaseEntity {
  /** Human number shown as TKT-000123, from a database sequence. */
  @Index('UQ_tickets_number', { unique: true })
  @Column({ type: 'bigint', generated: 'increment' })
  number: string;

  @Index('IDX_tickets_sender')
  @Column({ name: 'sender_user_id', type: 'uuid' })
  senderUserId: string;

  @Column({ name: 'desk_id', type: 'uuid' })
  deskId: string;

  @Column({ name: 'type_id', type: 'uuid' })
  typeId: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', default: '' })
  details: string;

  /** 0 normal, 1 urgent. */
  @Column({ type: 'smallint', default: 0 })
  priority: number;

  @Column({ name: 'needed_by', type: 'date' })
  neededBy: string;

  /** Copied from the type when the ticket is created; changing the type later does not move open tickets. */
  @Column({ name: 'assignee_user_id', type: 'uuid', nullable: true })
  assigneeUserId: string | null;

  /** Copied from the type when the ticket is created. Personal tickets are seen only by the sender and the assignee. */
  @Column({ name: 'is_personal', type: 'boolean', default: false })
  isPersonal: boolean;

  /** `open` | `close_requested` | `closed`. */
  @Column({ type: 'varchar', length: 20, default: 'open' })
  status: string;

  /** `confirmed` | `auto` | `not_executed`, set when closed. */
  @Column({ name: 'close_reason', type: 'varchar', length: 20, nullable: true })
  closeReason: string | null;

  @Column({ name: 'first_response_at', type: 'timestamptz', nullable: true })
  firstResponseAt: Date | null;

  @Column({ name: 'close_requested_at', type: 'timestamptz', nullable: true })
  closeRequestedAt: Date | null;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @Column({ name: 'last_activity_at', type: 'timestamptz', default: () => 'now()' })
  lastActivityAt: Date;

  @Column({ name: 'reopen_count', type: 'int', default: 0 })
  reopenCount: number;

  /** When the "stale" notice for the current quiet period was sent. */
  @Column({ name: 'stale_notified_at', type: 'timestamptz', nullable: true })
  staleNotifiedAt: Date | null;

  /** Optimistic concurrency: every change checks and bumps it. */
  @Column({ type: 'int', default: 1 })
  revision: number;

  @ManyToOne('TicketDesk')
  @JoinColumn({ name: 'desk_id', foreignKeyConstraintName: 'FK_tickets_desk' })
  private readonly deskFk?: unknown;

  @ManyToOne('TicketType')
  @JoinColumn({ name: 'type_id', foreignKeyConstraintName: 'FK_tickets_type' })
  private readonly typeFk?: unknown;

  @ManyToOne('User')
  @JoinColumn({ name: 'sender_user_id', foreignKeyConstraintName: 'FK_tickets_sender' })
  private readonly senderFk?: unknown;

  @ManyToOne('User')
  @JoinColumn({ name: 'assignee_user_id', foreignKeyConstraintName: 'FK_tickets_assignee' })
  private readonly assigneeFk?: unknown;
}

/** The timeline of a ticket: replies and every change. */
@Entity('ticket_events')
@Index('IDX_ticket_events_ticket', ['ticketId', 'createdAt'])
export class TicketEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ticket_id', type: 'uuid' })
  ticketId: string;

  @Column({ type: 'varchar', length: 30 })
  type: string;

  /** Null for the system (automatic closing). */
  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId: string | null;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne('Ticket', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id', foreignKeyConstraintName: 'FK_ticket_events_ticket' })
  private readonly ticketFk?: unknown;

  @ManyToOne('User', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_user_id', foreignKeyConstraintName: 'FK_ticket_events_actor' })
  private readonly actorFk?: unknown;
}

@Entity('ticket_attachments')
export class TicketAttachment {
  @PrimaryColumn({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @PrimaryColumn({ name: 'file_id', type: 'uuid' })
  fileId: string;

  @ManyToOne('TicketEvent', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id', foreignKeyConstraintName: 'FK_ticket_attachments_event' })
  private readonly eventFk?: unknown;

  @ManyToOne('StoredFile')
  @JoinColumn({ name: 'file_id', foreignKeyConstraintName: 'FK_ticket_attachments_file' })
  private readonly fileFk?: unknown;
}

export const TICKET_ENTITIES = [TicketDesk, TicketType, Ticket, TicketEvent, TicketAttachment];
