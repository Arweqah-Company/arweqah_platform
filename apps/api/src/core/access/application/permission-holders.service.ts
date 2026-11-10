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

  async holdersOf(key: string): Promise<string[]> {
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > Date.now() && !this.config.isTest) return hit.userIds; // the tests change who holds a key between one request and the next
    const ids = await this.repo.activeUserIds();
    const holders: string[] = [];
    for (let i = 0; i < ids.length; i += BATCH) {
      const contexts = await Promise.all(ids.slice(i, i + BATCH).map((id) => this.contexts.forUser(id)));
      contexts.forEach((c, n) => { if (c?.isActive && c.filterFor(key)) holders.push(ids[i + n] as string); });
    }
    this.cache.set(key, { userIds: holders, expiresAt: Date.now() + CACHE_TTL_MS });
    return holders;
  }

  @OnEvent(ACCESS_CHANGED)
  invalidate(): void {
    this.cache.clear();
  }
}
