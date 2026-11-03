import { Column } from 'typeorm';

/** What every grant given to one person carries: the last day it holds, who gave it and when (the foreign key to the giver is declared by each table). */
export abstract class GrantStamp {
  /** The last day it holds (null = no end date); a nightly job takes back what has ended. */
  @Column({ name: 'expires_at', type: 'date', nullable: true })
  expiresAt: string | null;

  @Column({ name: 'granted_by', type: 'uuid', nullable: true })
  grantedBy: string | null;

  @Column({ name: 'granted_at', type: 'timestamptz', default: () => 'now()' })
  grantedAt: Date;
}
