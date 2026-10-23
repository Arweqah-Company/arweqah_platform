import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { CorePermission, HIDEABLE_PAGES, type HideablePage, type PageVisibilityDto, type RolePagesInput } from '@arweqah-platform/shared';
import { NotFoundError } from '../../../common/domain/domain-error';
import { AUDIT_EVENT, type AuditEvent } from '../../audit/application/audit.events';
import type { AccessContext } from '../domain/access-context';
import { RoleRepository } from '../domain/access.repository';
import { RolePagesLockedError } from '../domain/errors';
import { PageVisibilityRepository } from '../domain/page-visibility.repository';
import type { Role } from '../domain/role.entity';
import { ACCESS_CHANGED } from './access.events';

const CACHE_TTL_MS = 30_000;
const isPage = (key: string): key is HideablePage => (HIDEABLE_PAGES as readonly string[]).includes(key);
const isLocked = (role: Role): boolean => role.permissions.some((p) => p.key === CorePermission.PagesManage);

/** Which pages are hidden from which roles, and what that means for one person (hidden only when every one of their roles hides it). */
@Injectable()
export class PageVisibilityService {
  private readonly cache = new Map<string, { pages: HideablePage[]; expiresAt: number }>();

  constructor(
    private readonly rules: PageVisibilityRepository,
    private readonly roles: RoleRepository,
    private readonly events: EventEmitter2,
  ) {}

  /** Pages the person may not open. A person who manages page visibility always sees every page. */
  async hiddenFor(ctx: AccessContext): Promise<HideablePage[]> {
    if (ctx.has(CorePermission.PagesManage)) return [];
    const hit = this.cache.get(ctx.userId);
    if (hit && hit.expiresAt > Date.now()) return hit.pages;
    const pages = (await this.rules.hiddenForUser(ctx.userId)).filter(isPage);
    this.cache.set(ctx.userId, { pages, expiresAt: Date.now() + CACHE_TTL_MS });
    return pages;
  }

  async overview(): Promise<PageVisibilityDto> {
    const [roles, rules] = await Promise.all([this.roles.findAll(), this.rules.allRules()]);
    return {
      pages: [...HIDEABLE_PAGES],
      roles: roles.map((r) => ({ id: r.id, nameAr: r.nameAr, nameEn: r.nameEn, locked: isLocked(r), hiddenPages: (rules.get(r.id) ?? []).filter(isPage) })),
    };
  }

  async setForRole(roleId: string, input: RolePagesInput, actorId: string): Promise<PageVisibilityDto['roles'][number]> {
    const role = await this.roles.findById(roleId);
    if (!role) throw new NotFoundError('Role', roleId);
    if (isLocked(role) && input.hiddenPages.length > 0) throw new RolePagesLockedError();
    const hiddenPages = [...new Set(input.hiddenPages)];
    await this.rules.replaceForRole(roleId, hiddenPages);
    this.events.emit(ACCESS_CHANGED, {});
    this.audit(actorId, roleId, { hiddenPages });
    return { id: role.id, nameAr: role.nameAr, nameEn: role.nameEn, locked: isLocked(role), hiddenPages };
  }

  @OnEvent(ACCESS_CHANGED)
  invalidate(): void {
    this.cache.clear();
  }

  private audit(actorId: string, roleId: string, changes: Record<string, unknown>): void {
    const event: AuditEvent = { actorId, action: 'role.pages_updated', entityType: 'role', entityId: roleId, changes };
    this.events.emit(AUDIT_EVENT, event);
  }
}
