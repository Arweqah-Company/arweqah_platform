import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

/** One page hidden from one role. A page with no row stays visible. */
@Entity('page_visibility_rules')
export class PageVisibilityRule {
  @PrimaryColumn({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @PrimaryColumn({ name: 'page_key', type: 'varchar', length: 40 })
  pageKey: string;

  // Constraint only: deleting a role removes its rules.
  @ManyToOne('Role', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id', foreignKeyConstraintName: 'FK_page_visibility_role' })
  role: unknown;
}
