import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('notifications')
@Index(['userId', 'readAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'title_ar', type: 'varchar', length: 200 })
  titleAr: string;

  @Column({ name: 'title_en', type: 'varchar', length: 200 })
  titleEn: string;

  @Column({ name: 'body_ar', type: 'text' })
  bodyAr: string;

  @Column({ name: 'body_en', type: 'text' })
  bodyEn: string;

  /** In-app route to open, e.g. "/leaves/123". Never an external URL. */
  @Column({ type: 'varchar', length: 300, nullable: true })
  link: string | null;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_notifications_user' })
  private readonly userFk?: unknown;
}
