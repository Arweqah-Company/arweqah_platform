import { Column } from 'typeorm';
import { BaseEntity } from './base.entity';

/** A record with an Arabic and an English name and an optional note (roles, groups of roles, groups of people). */
export abstract class NamedEntity extends BaseEntity {
  @Column({ name: 'name_ar', type: 'varchar', length: 120 })
  nameAr: string;

  @Column({ name: 'name_en', type: 'varchar', length: 120 })
  nameEn: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;
}
