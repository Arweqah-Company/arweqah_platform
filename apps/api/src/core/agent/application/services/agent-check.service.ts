import { Injectable } from '@nestjs/common';
import { PageVisibilityService } from '../../../access/application/page-visibility.service';
import type { AccessContext } from '../../../access/domain/access-context';
import { entryLine, matchEntries, type PermissionEntry } from '../../domain/rules/agent-check.rules';
import { AgentCatalogService } from './agent-catalog.service';

/**
 * «Do I have permission to …?» and «can the platform do …?» (FR-151): looks in EVERYTHING the platform can do, not only in this employee's list, and tells
 * the model, for the best matches, whether the employee can use it, lacks its permission, has its page hidden, or cannot do it from the chat.
 * Only names of actions and permissions go out, never data.
 */
@Injectable()
export class AgentCheckService {
  constructor(
    private readonly catalog: AgentCatalogService,
    private readonly pages: PageVisibilityService,
  ) {}

  /** The lines for the model, or null when the platform has nothing like it. */
  async find(ctx: AccessContext, topic: string): Promise<string | null> {
    const hidden = new Set<string>(await this.pages.hiddenFor(ctx));
    const entries: PermissionEntry[] = [
      ...this.catalog.all().map((a) => ({
        permission: a.permission,
        labelAr: a.labelAr,
        labelEn: a.labelEn,
        state: !ctx.has(a.permission) ? ('no-permission' as const) : a.pageKey && hidden.has(a.pageKey) ? ('page-hidden' as const) : ('allowed' as const),
        reason: null,
        holds: ctx.has(a.permission),
      })),
      ...this.catalog.excluded().flatMap((e) => (e.permission && e.labelAr && e.labelEn ? [{ permission: e.permission, labelAr: e.labelAr, labelEn: e.labelEn, state: 'chat-unavailable' as const, reason: e.reason, holds: ctx.has(e.permission) }] : [])),
    ];
    const best = matchEntries(topic, entries);
    return best.length > 0 ? best.map(entryLine).join('\n') : null;
  }
}
