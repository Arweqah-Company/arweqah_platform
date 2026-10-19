import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/domain/base.entity';

@Entity('files')
export class StoredFile extends BaseEntity {
  @Index()
  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  /** Random server-side key; the original name is never used as a path. */
  @Column({ name: 'storage_key', type: 'varchar', length: 200, unique: true })
  storageKey: string;

  @Column({ name: 'original_name', type: 'varchar', length: 200 })
  originalName: string;

  @Column({ name: 'content_type', type: 'varchar', length: 100 })
  contentType: string;

  @Column({ type: 'int' })
  size: number;

  @ManyToOne('User')
  @JoinColumn({ name: 'owner_id', foreignKeyConstraintName: 'FK_files_owner' })
  private readonly ownerFk?: unknown;
}
