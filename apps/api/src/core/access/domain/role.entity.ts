import type { PermissionGrant, PermissionScope } from '@arweqah-platform/shared';
import { Column, Entity, OneToMany, PrimaryColumn, ManyToOne, JoinColumn, type Relation } from 'typeorm';
import { BaseEntity } from '../../../common/domain/base.entity';
import { BusinessRuleError } from '../../../common/domain/domain-error';

@Entity('role_permissions')
export class RolePermission {
  @PrimaryColumn({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @PrimaryColumn({ name: 'permission_key', type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'varchar', length: 20 })
  scope: PermissionScope;

  @ManyToOne(() => Role, (role) => role.permissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Relation<Role>;
}

/** A role built from the permission catalog at runtime (managed from the admin panel). */
@Entity('roles')
export class Role extends BaseEntity {
  @Column({ name: 'name_ar', type: 'varchar', length: 120 })
  nameAr: string;

  @Column({ name: 'name_en', type: 'varchar', length: 120 })
  nameEn: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  /** System roles (seeded) cannot be deleted. */
  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;

  @OneToMany(() => RolePermission, (p) => p.role, { cascade: true, eager: true })
  permissions: RolePermission[];

  replacePermissions(grants: PermissionGrant[]): void {
    const unique = new Map(grants.map((g) => [g.key, g.scope]));
    this.permissions = [...unique].map(([key, scope]) =>
      Object.assign(new RolePermission(), { roleId: this.id, key, scope }),
    );
  }

  assertDeletable(): void {
    if (this.isSystem) throw new BusinessRuleError('System roles cannot be deleted');
  }
}
