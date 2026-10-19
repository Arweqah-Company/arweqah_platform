import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CorePermission,
  type CreateUserInput,
  type MeDto,
  type Paginated,
  type PlacementInput,
  type UserDto,
  type UsersQuery,
} from '@arweqah-platform/shared';
import { BusinessRuleError, ForbiddenError, NotFoundError } from '../../../common/domain/domain-error';
import { AbilityFactory } from '../../../core/access/application/ability.factory';
import { ACCESS_CHANGED } from '../../../core/access/application/access.events';
import { UserAccessService } from '../../../core/access/application/user-access.service';
import type { AccessContext, Placement } from '../../../core/access/domain/access-context';
import { AUDIT_EVENT, type AuditEvent } from '../../../core/audit/application/audit.events';
import { IdentityProvider } from '../../../core/auth/application/identity-provider';
import { OrgService } from '../../org/application/org.service';
import type { User } from '../domain/user.entity';
import { UserRepository } from '../domain/user.repository';

const NO_PLACEMENT: Placement = { branchId: null, departmentId: null, teamId: null, managerId: null };

@Injectable()
export class UsersService {
  constructor(
    private readonly users: UserRepository,
    private readonly access: UserAccessService,
    private readonly ability: AbilityFactory,
    private readonly identity: IdentityProvider,
    private readonly org: OrgService,
    private readonly events: EventEmitter2,
  ) {}

  async me(ctx: AccessContext): Promise<MeDto> {
    const [dto] = await this.toDtos([await this.mustFind(ctx.userId)]);
    return { ...(dto as UserDto), permissions: ctx.grants() };
  }

  async list(ctx: AccessContext, query: UsersQuery): Promise<Paginated<UserDto>> {
    const scope = ctx.filterFor(CorePermission.UsersView);
    if (!scope) throw new ForbiddenError();
    const page = await this.users.search(query, scope);
    return { ...page, items: await this.toDtos(page.items) };
  }

  async get(ctx: AccessContext, id: string): Promise<UserDto> {
    const user = await this.mustFind(id);
    await this.assertInScope(ctx, CorePermission.UsersView, user.id);
    const [dto] = await this.toDtos([user]);
    return dto as UserDto;
  }

  async create(ctx: AccessContext, input: CreateUserInput): Promise<UserDto> {
    const placement = input.placement ?? NO_PLACEMENT;
    await this.org.assertPlacement(placement);
    this.ability.assertCan(ctx, CorePermission.UsersManage, placementResource(placement));
    const id = await this.identity.createUser({ name: input.name, email: input.email, locale: input.locale, password: input.password });
    await this.access.savePlacement(id, placement);
    if (input.roleIds.length) await this.access.replaceRoles(id, input.roleIds);
    this.audit(ctx.userId, 'user.created', id, { email: input.email, roleIds: input.roleIds });
    return this.get(ctx, id);
  }

  async assignRoles(ctx: AccessContext, id: string, roleIds: string[]): Promise<UserDto> {
    if (id === ctx.userId) throw new BusinessRuleError('You cannot change your own roles');
    await this.assertInScope(ctx, CorePermission.UsersManage, (await this.mustFind(id)).id);
    await this.access.replaceRoles(id, roleIds);
    this.audit(ctx.userId, 'user.roles_changed', id, { roleIds });
    return this.get(ctx, id);
  }

  async setPlacement(ctx: AccessContext, id: string, placement: PlacementInput): Promise<UserDto> {
    await this.assertInScope(ctx, CorePermission.UsersManage, (await this.mustFind(id)).id);
    await this.org.assertPlacement(placement);
    // The destination must also be inside the manager's scope.
    this.ability.assertCan(ctx, CorePermission.UsersManage, placementResource(placement));
    await this.access.savePlacement(id, placement);
    this.audit(ctx.userId, 'user.placement_changed', id, { ...placement });
    return this.get(ctx, id);
  }

  async setActive(ctx: AccessContext, id: string, active: boolean): Promise<UserDto> {
    const user = await this.mustFind(id);
    await this.assertInScope(ctx, CorePermission.UsersManage, user.id);
    user.setActive(active, ctx.userId);
    await this.users.save(user);
    if (!active) await this.identity.revokeAllSessions(id);
    this.events.emit(ACCESS_CHANGED, { userId: id });
    this.audit(ctx.userId, active ? 'user.activated' : 'user.deactivated', id, {});
    return this.get(ctx, id);
  }

  /** Out-of-scope records answer 404, so their existence is not revealed. */
  private async assertInScope(ctx: AccessContext, key: string, userId: string): Promise<void> {
    const placement = (await this.access.placementsOf([userId])).get(userId) ?? NO_PLACEMENT;
    if (!this.ability.can(ctx, key, { ownerId: userId, ...placementResource(placement) })) {
      throw new NotFoundError('User', userId);
    }
  }

  private async mustFind(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError('User', id);
    return user;
  }

  private async toDtos(users: User[]): Promise<UserDto[]> {
    const ids = users.map((u) => u.id);
    const [roles, placements] = await Promise.all([this.access.rolesOf(ids), this.access.placementsOf(ids)]);
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      locale: u.locale,
      isActive: u.isActive,
      twoFactorEnabled: !!u.twoFactorEnabled,
      roles: (roles.get(u.id) ?? []).map((r) => ({ id: r.id, nameAr: r.nameAr, nameEn: r.nameEn })),
      placement: placements.get(u.id) ?? NO_PLACEMENT,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  private audit(actorId: string, action: string, entityId: string, changes: Record<string, unknown>): void {
    const event: AuditEvent = { actorId, action, entityType: 'user', entityId, changes };
    this.events.emit(AUDIT_EVENT, event);
  }
}

function placementResource(p: Placement) {
  return { branchId: p.branchId, departmentId: p.departmentId, teamId: p.teamId };
}
