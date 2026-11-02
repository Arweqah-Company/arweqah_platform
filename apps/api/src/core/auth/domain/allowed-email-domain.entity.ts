import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/** A domain a work e-mail may use. With no row at all, there is no rule. */
@Entity('allowed_email_domains')
export class AllowedEmailDomain {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  domain: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
