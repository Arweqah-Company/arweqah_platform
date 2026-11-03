import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { ImpersonationDto } from '@arweqah-platform/shared';
import { Clock } from '../../../common/application/clock';
import { NotFoundError } from '../../../common/domain/domain-error';
import { AUDIT_EVENT, type AuditEvent } from '../../audit/application/audit.events';
import { SecuritySettingsService } from '../../auth/application/security-settings.service';
import { NotificationsService } from '../../notifications/application/notifications.service';
import type { AccessContext } from '../domain/access-context';
import { ImpersonationDisabledError, ImpersonationEndedError, ImpersonationForbiddenError, ImpersonationNestedError, ImpersonationTargetError } from '../domain/errors';
import { ImpersonationRepository } from '../domain/impersonation.repository';
import { impersonationIdle, isForbiddenWhileImpersonating } from '../domain/impersonation.rules';
import { SessionSwitcher } from '../domain/session-switcher';
import { IMPERSONATION_AUDIT, impersonationEndedNotice, type ImpersonationEndReason } from './impersonation.messages';

/** The session facts «sign in as» needs, read from the request. */
export interface SessionFacts {
  id: string;
  impersonatedByUserId?: string | null;
  impersonationLastActivityAt?: Date | string | null;
}

const STOP_PATH = '/impersonation/stop';

/**
 * «Sign in as»: a platform administrator (in admin mode, with `impersonation.start`) works as another active employee with that person's
 * permissions and scope, without their code. The session is the employee's own, marked with the administrator; it ends by going back,
 * after idle minutes, or when the feature is switched off. Every audit entry written inside it also names the administrator.
 */
@Injectable()
export class ImpersonationService {
  constructor(
    private readonly repo: ImpersonationRepository,
    private readonly switcher: SessionSwitcher,
    private readonly settings: SecuritySettingsService,
    private readonly notifications: NotificationsService,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  async isEnabled(): Promise<boolean> {
    return (await this.settings.get('impersonationEnabled')) === 1;
  }

  /** Switches the browser to the employee's session; answers the cookies to send. */
  async start(admin: AccessContext, session: SessionFacts, targetUserId: string): Promise<string[]> {
    if (session.impersonatedByUserId) throw new ImpersonationNestedError();
    if (!(await this.isEnabled())) throw new ImpersonationDisabledError();
    if (targetUserId === admin.userId) throw new ImpersonationTargetError();
    const target = await this.repo.accountOf(targetUserId);
    if (!target) throw new NotFoundError('User', targetUserId);
    if (!target.isActive) throw new ImpersonationTargetError();
    const cookies = await this.switcher.openFor(targetUserId, admin.userId, session.id);
    this.audit(admin.userId, IMPERSONATION_AUDIT.started, targetUserId, {});
    return cookies;
  }

  /** Ends the «sign in as» session, signs the browser back in as the administrator and tells the employee; answers the cookies to send. */
  async stop(session: SessionFacts): Promise<string[]> {
    const state = await this.repo.find(session.id);
    if (!state) throw new NotFoundError('Impersonation');
    const now = this.clock.now();
    const reason = await this.endReason(session, now);
    const origin = await this.repo.tokenOfLiveSession(state.impersonatorSessionId, now);
    await this.repo.end(session.id);
    const minutes = Math.max(1, Math.round((now.getTime() - state.startedAt.getTime()) / 60_000));
    this.audit(state.impersonatedBy, IMPERSONATION_AUDIT.ended, state.userId, { reason, minutes });
    await this.tellEmployee(state.impersonatedBy, state.userId, state.startedAt, minutes);
    return origin ? this.switcher.returnTo(origin) : [];
  }

  /** Called for every request: refuses what a «sign in as» session may not do, ends nothing by itself, and counts the request as activity. */
  async check(session: SessionFacts, method: string, path: string): Promise<void> {
    if (!session.impersonatedByUserId || path.replace(/^\/api(?=\/)/, '') === STOP_PATH) return;
    if ((await this.endReason(session, this.clock.now())) !== 'manual') throw new ImpersonationEndedError();
    if (isForbiddenWhileImpersonating(method, path)) throw new ImpersonationForbiddenError();
    await this.repo.touch(session.id, this.clock.now());
  }

  /** What the web shows in the bar; null for a normal sign-in. */
  async describe(session: SessionFacts & { createdAt?: Date | string }): Promise<ImpersonationDto | null> {
    if (!session.impersonatedByUserId) return null;
    const by = await this.repo.accountOf(session.impersonatedByUserId);
    return {
      by: { id: session.impersonatedByUserId, name: by?.name ?? '' },
      startedAt: new Date(session.createdAt ?? this.clock.now()).toISOString(),
      idleMinutes: await this.settings.get('impersonationIdleMinutes'),
    };
  }

  private async endReason(session: SessionFacts, now: Date): Promise<ImpersonationEndReason> {
    if (!(await this.isEnabled())) return 'disabled';
    return impersonationIdle(session.impersonationLastActivityAt ?? null, await this.settings.get('impersonationIdleMinutes'), now) ? 'idle' : 'manual';
  }

  private async tellEmployee(adminId: string, employeeId: string, startedAt: Date, minutes: number): Promise<void> {
    const admin = await this.repo.accountOf(adminId);
    await this.notifications.notify({ userIds: [employeeId], ...impersonationEndedNotice(admin?.name ?? '', startedAt, minutes) });
  }

  private audit(actorId: string, action: string, targetId: string, changes: Record<string, unknown>): void {
    const event: AuditEvent = { actorId, action, entityType: 'user', entityId: targetId, changes };
    this.events.emit(AUDIT_EVENT, event);
  }
}
