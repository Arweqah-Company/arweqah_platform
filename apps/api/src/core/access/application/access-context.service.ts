import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AccessContext } from '../domain/access-context';
import { UserAccessRepository } from '../domain/access.repository';
import { ACCESS_CHANGED } from './access.events';

const CACHE_TTL_MS = 30_000;

/** Builds (and briefly caches) the AccessContext of a user. */
@Injectable()
export class AccessContextService {
  private readonly cache = new Map<string, { context: AccessContext; expiresAt: number }>();

  constructor(private readonly repo: UserAccessRepository) {}

  async forUser(userId: string): Promise<AccessContext | null> {
    const hit = this.cache.get(userId);
    if (hit && hit.expiresAt > Date.now()) return hit.context;
    const record = await this.repo.loadAccess(userId);
    if (!record) return null;
    const context = new AccessContext(
      userId,
      record.placement,
      record.grants,
      record.isActive,
      record.reach,
      record.elevatedGrants,
      record.restrictedNodes,
    );
    this.cache.set(userId, { context, expiresAt: Date.now() + CACHE_TTL_MS });
    return context;
  }

  /** Roles, grants, placement or status changed: drop cached contexts. */
  @OnEvent(ACCESS_CHANGED)
  invalidate(payload?: { userId?: string }): void {
    if (payload?.userId) this.cache.delete(payload.userId);
    else this.cache.clear();
  }
}
