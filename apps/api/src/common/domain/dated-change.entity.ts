import { Column } from 'typeorm';
import { BaseEntity } from './base.entity';

/** The columns every dated change of a record shares: why it was made, by whom, and when it was written to the record (empty while it waits for its day). */
export abstract class DatedChangeEntity extends BaseEntity {
  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ name: 'applied_at', type: 'timestamptz', nullable: true })
  appliedAt: Date | null;
}
