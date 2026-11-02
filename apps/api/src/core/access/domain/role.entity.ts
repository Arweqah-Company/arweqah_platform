import { isDerivedRule, type PermissionGrant, type PermissionScope, type RoleAssignment, type RoleAutoRule } from '@arweqah-platform/shared';
import { Column, Entity, Index, OneToMany, PrimaryColumn, ManyToOne, JoinColumn, type Relation } from 'typeorm';
import { NamedEntity } from '../../../common/domain/named.entity';
import { BusinessRuleError } from '../../../common/domain/domain-error';
import { DerivedRoleError } from './errors';

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
export class Role extends NamedEntity {
  /** System roles (seeded) cannot be deleted. */
  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;

  /** Auto: given by a rule or a setup elsewhere; manual: given by HR or an administrator. */
  @Column({ type: 'varchar', length: 10, default: 'manual' })
  assignment: RoleAssignment;

  /** The rule that keeps the members of an auto role up to date (see AutoRolesService); null when there is none. */
  @Column({ name: 'auto_rule', type: 'varchar', length: 20, nullable: true })
  autoRule: RoleAutoRule | null;

  /** `job_title` roles: the job title the role was made for; the members are the people who hold it. */
  @Index('UQ_roles_job_title', { unique: true, where: 'job_title_id IS NOT NULL' })
  @Column({ name: 'job_title_id', type: 'uuid', nullable: true })
  jobTitleId: string | null;

  /** `node_head` roles: the organization unit the role was made for; the member is the manager of that unit. */
  @Index('UQ_roles_org_node', { unique: true, where: 'org_node_id IS NOT NULL' })
  @Column({ name: 'org_node_id', type: 'uuid', nullable: true })
  orgNodeId: string | null;

  @ManyToOne('JobTitle', { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'job_title_id', foreignKeyConstraintName: 'FK_roles_job_title' })
  private readonly jobTitleFk?: unknown;

  @ManyToOne('OrgNode', { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'org_node_id', foreignKeyConstraintName: 'FK_roles_org_node' })
  private readonly orgNodeFk?: unknown;

  @OneToMany(() => RolePermission, (p) => p.role, { cascade: true, eager: true })
  permissions: RolePermission[];

  replacePermissions(grants: PermissionGrant[]): void {
    const unique = new Map(grants.map((g) => [g.key, g.scope]));
    this.permissions = [...unique].map(([key, scope]) =>
      Object.assign(new RolePermission(), { roleId: this.id, key, scope }),
    );
  }

  /** A role kept up to date by a rule stays automatic. */
  assertAssignment(next: RoleAssignment | undefined): void {
    if (this.autoRule && next === 'manual') throw new BusinessRuleError('A role kept up to date by a rule cannot become manual');
  }

  /** A role made for a job title or an organization level follows it: it is removed with it, never by hand. */
  get isDerived(): boolean {
    return isDerivedRule(this.autoRule);
  }

  /** Permissions and description may change; the name and the members follow the job title or level. */
  assertNameUnchanged(next: { nameAr: string; nameEn: string }): void {
    if (this.isDerived && (next.nameAr !== this.nameAr || next.nameEn !== this.nameEn)) {
      throw new DerivedRoleError('The name of this role follows its job title or level');
    }
  }

  assertDeletable(): void {
    if (this.isSystem) throw new BusinessRuleError('System roles cannot be deleted');
    if (this.isDerived) throw new DerivedRoleError('This role is removed together with its job title or level');
  }
}
