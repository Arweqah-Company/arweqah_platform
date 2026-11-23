import { isDerivedRule, storedFields, type PermissionGrant, type RoleAssignment, type RoleAutoRule } from '@arweqah-platform/shared';
import { Column, Entity, Index, OneToMany, PrimaryColumn, ManyToOne, JoinColumn, type Relation } from 'typeorm';
import { NamedEntity } from '../../../common/domain/named.entity';
import { BusinessRuleError } from '../../../common/domain/domain-error';
import { DerivedRoleError } from './errors';
import { GrantReach } from './grant-reach.entity';

@Entity('role_permissions')
export class RolePermission extends GrantReach {
  @PrimaryColumn({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @PrimaryColumn({ name: 'permission_key', type: 'varchar', length: 100 })
  key: string;

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
    const unique = new Map(grants.map((g) => [g.key, g]));
    this.permissions = [...unique.values()].map((g) =>
      Object.assign(new RolePermission(), { roleId: this.id, key: g.key, scope: g.scope, fields: storedFields(g) }),
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

  /** The role of a notice channel's writers: its keys are fixed by the system and change only by a migration (decision N7). */
  get hasFixedPermissions(): boolean {
    return this.autoRule === 'notice_writer';
  }

  /** A role with fixed permissions refuses a different list (the same keys at the same scopes are fine, so saving its name or description works). */
  assertPermissionsUnchanged(next: PermissionGrant[]): void {
    if (!this.hasFixedPermissions) return;
    const key = (g: { key: string; scope: string }) => `${g.key}@${g.scope}`;
    const current = new Set((this.permissions ?? []).map(key));
    if (next.length !== current.size || next.some((g) => !current.has(key(g)))) throw new DerivedRoleError('The permissions of this role are fixed by the system');
  }

  /** Permissions and description may change; the name and the members follow the job title or level. */
  assertNameUnchanged(next: { nameAr: string; nameEn: string }): void {
    if (this.isDerived && (next.nameAr !== this.nameAr || next.nameEn !== this.nameEn)) {
      throw new DerivedRoleError('The name of this role follows its job title or level');
    }
  }

  assertDeletable(): void {
    if (this.hasFixedPermissions) throw new DerivedRoleError('This role belongs to a notice channel and cannot be deleted');
    if (this.isSystem) throw new BusinessRuleError('System roles cannot be deleted');
    if (this.isDerived) throw new DerivedRoleError('This role is removed together with its job title or level');
  }
}
