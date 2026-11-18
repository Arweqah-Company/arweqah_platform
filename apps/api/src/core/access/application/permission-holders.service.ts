import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AppConfig } from '../../../config/app-config.service';
import { UserAccessRepository } from '../domain/access.repository';
import { ACCESS_CHANGED } from './access.events';
import { AccessContextService } from './access-context.service';

const CACHE_TTL_MS = 5 * 60_000;
const BATCH = 50;

/**
 * «Who holds this key»: the active users whose own permissions (roles, groups of roles and of people, personal grants and exceptions) include it. Asked for work that must reach
 * the people who can do something (a reminder, a notice, a readiness warning), never to decide whether one request is allowed (that is `AccessContext`). The answer is kept five
 * minutes and dropped when access changes.
 */
@Injectable()
export class PermissionHoldersService {
  private readonly cache = new Map<string, { userIds: string[]; expiresAt: number }>();

  constructor(
    private readonly repo: UserAccessRepository,
    private readonly contexts: AccessContextService,
    private readonly config: AppConfig,
  ) {}

  /** `beyondOwn`: leave out those whose grant reaches only their own record (the Employee role holds `employees.update` that way), so the answer is who looks after others. */
  async holdersOf(key: string, options: { beyondOwn?: boolean } = {}): Promise<string[]> {
    const cacheKey = options.beyondOwn ? `${key}:beyond-own` : key;
    const hit = this.cache.get(cacheKey);
    if (hit && hit.expiresAt > Date.now() && !this.config.isTest) return hit.userIds; // the tests change who holds a key between one request and the next
    const ids = await this.repo.activeUserIds();
    const holders: string[] = [];
    for (let i = 0; i < ids.length; i += BATCH) {
      const contexts = await Promise.all(ids.slice(i, i + BATCH).map((id) => this.contexts.forUser(id)));
      contexts.forEach((c, n) => { if (c?.isActive && this.holds(c.filterFor(key), options.beyondOwn)) holders.push(ids[i + n] as string); });
    }
    this.cache.set(cacheKey, { userIds: holders, expiresAt: Date.now() + CACHE_TTL_MS });
    return holders;
  }

  private holds(filter: { scope: string } | null, beyondOwn?: boolean): boolean {
    return !!filter && !(beyondOwn && filter.scope === 'own');
  }

  @OnEvent(ACCESS_CHANGED)
  invalidate(): void {
    this.cache.clear();
  }
}
