import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { AdminModeDto } from '@arweqah-platform/shared';
import { Clock } from '../../../common/application/clock';
import { AUDIT_EVENT, type AuditEvent } from '../../audit/application/audit.events';
import { AuthenticatorService } from '../../auth/application/authenticator.service';
import { AuthenticatorLockedError, InvalidCodeError } from '../../auth/domain/errors';
import type { AccessContext } from '../domain/access-context';
import { AdminModeRepository } from '../domain/admin-mode.repository';
import { adminModeExpiry, isAdminModeActive } from '../domain/admin-mode.rules';
import { AdminModeNotAllowedError, AdminModeRequiredError, CodeAlreadyUsedError } from '../domain/errors';
import { AdminModeEligibility } from './admin-mode-eligibility';
import { ADMIN_MODE_AUDIT } from './admin-mode.messages';

/**
 * Platform admin mode: people with an administrative capability work as an ordinary employee until they switch it on
 * with a fresh code from their authenticator app. It is enforced here, on the server (@RequireAdminMode), not in the web app.
 */
@Injectable()
export class AdminModeService {
  constructor(
    private readonly repo: AdminModeRepository,
    private readonly authenticator: AuthenticatorService,
    private readonly eligibility: AdminModeEligibility,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  async status(ctx: AccessContext, sessionId: string): Promise<AdminModeDto> {
    if (!(await this.eligibility.isEligible(ctx))) return { available: false, active: false, expiresAt: null };
    const state = await this.repo.find(sessionId);
    const active = isAdminModeActive(state, this.clock.now());
    return { available: true, active, expiresAt: active ? (adminModeExpiry(state)?.toISOString() ?? null) : null };
  }

  /** Needs a code that was never used before, so every activation is a fresh proof. */
  async activate(ctx: AccessContext, sessionId: string, code: string): Promise<AdminModeDto> {
    if (!(await this.eligibility.isEligible(ctx))) throw new AdminModeNotAllowedError();
    const result = await this.authenticator.verifyAppCode(ctx.userId, code);
    if (result === 'locked') throw new AuthenticatorLockedError();
    if (result === 'used') throw new CodeAlreadyUsedError();
    if (result !== 'ok') throw new InvalidCodeError();
    await this.repo.activate(sessionId, ctx.userId, this.clock.now());
    this.audit(ctx.userId, ADMIN_MODE_AUDIT.enabled);
    return this.status(ctx, sessionId);
  }

  async deactivate(ctx: AccessContext, sessionId: string): Promise<void> {
    if (!(await this.repo.find(sessionId))?.enabledAt) return;
    await this.repo.deactivate(sessionId);
    this.audit(ctx.userId, ADMIN_MODE_AUDIT.disabled);
  }

  /** For routes of the admin pages: passes while it is on and counts as activity (the idle time restarts). */
  async assertActive(ctx: AccessContext, sessionId: string): Promise<void> {
    const state = await this.repo.find(sessionId);
    const now = this.clock.now();
    if (isAdminModeActive(state, now) && (await this.eligibility.isEligible(ctx))) {
      await this.repo.touch(sessionId, now);
      return;
    }
    if (state?.enabledAt) {
      await this.repo.deactivate(sessionId);
      this.audit(ctx.userId, ADMIN_MODE_AUDIT.expired);
    }
    throw new AdminModeRequiredError();
  }

  private audit(actorId: string, action: string): void {
    const event: AuditEvent = { actorId, action, entityType: 'user', entityId: actorId };
    this.events.emit(AUDIT_EVENT, event);
  }
}
