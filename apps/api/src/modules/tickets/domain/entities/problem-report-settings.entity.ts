import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** The settings of the «report a problem» button: one row, `id` = 1 (the migration inserts it). */
@Entity('problem_report_settings')
export class ProblemReportSettings {
  @PrimaryColumn({ type: 'smallint' })
  id: number;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  /** The ticket type every report becomes; empty until the administrator chooses. */
  @Column({ name: 'ticket_type_id', type: 'uuid', nullable: true })
  ticketTypeId: string | null;

  @Column({ name: 'analyze_with_ai', type: 'boolean', default: true })
  analyzeWithAi: boolean;

  @Column({ name: 'send_image_to_ai', type: 'boolean', default: false })
  sendImageToAi: boolean;

  @Column({ name: 'max_per_hour', type: 'int', default: 10 })
  maxPerHour: number;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne('TicketType', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'ticket_type_id', foreignKeyConstraintName: 'FK_problem_report_settings_type' })
  private readonly typeFk?: unknown;
}
