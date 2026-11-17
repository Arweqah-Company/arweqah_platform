import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { AdminModeDto } from '@arweqah-platform/shared';
import { Clock } from '../../../common/application/clock';
import { AUDIT_EVENT, type AuditEvent } from '../../audit/application/audit.events';
import { SecuritySettingsService } from '../../auth/application/security-settings.service';
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
    private readonly security: SecuritySettingsService,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  async status(ctx: AccessContext, sessionId: string): Promise<AdminModeDto> {
    if (!(await this.eligibility.isEligible(ctx))) return { available: false, active: false, expiresAt: null };
    const state = await this.repo.find(sessionId);
    const active = isAdminModeActive(state, this.clock.now());
    return { available: true, active, expiresAt: active ? (adminModeExpiry(state)?.toISOString() ?? null) : null };
  }

  /** Is platform admin mode on for this session, for a person who may use it? Does not restart the idle time. */
  async isActive(ctx: AccessContext, sessionId: string): Promise<boolean> {
    return (await this.status(ctx, sessionId)).active;
  }

  /** What the person may do in this session: the grants of their administrative roles count only while the mode is on. */
  async effective(ctx: AccessContext, sessionId: string): Promise<AccessContext> {
    if (!ctx.hasElevatedGrants) return ctx;
    return (await this.isActive(ctx, sessionId)) ? ctx.elevate() : ctx;
  }

  /**
   * Needs a code that was never used before, so every activation is a fresh proof; unless an administrator switched the security setting
   * `adminModeRequiresCode` off (for testing), when the code is not asked for.
   */
  async activate(ctx: AccessContext, sessionId: string, code: string | undefined): Promise<AdminModeDto> {
    if (!(await this.eligibility.isEligible(ctx))) throw new AdminModeNotAllowedError();
    if ((await this.security.get('adminModeRequiresCode')) === 1) await this.assertFreshCode(ctx.userId, code);
    await this.repo.activate(sessionId, ctx.userId, this.clock.now());
    this.audit(ctx.userId, ADMIN_MODE_AUDIT.enabled);
    return this.status(ctx, sessionId);
  }

  private async assertFreshCode(userId: string, code: string | undefined): Promise<void> {
    if (code === undefined) throw new InvalidCodeError();
    const result = await this.authenticator.verifyAppCode(userId, code);
    if (result === 'locked') throw new AuthenticatorLockedError();
    if (result === 'used') throw new CodeAlreadyUsedError();
    if (result !== 'ok') throw new InvalidCodeError();
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
