import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { SessionDto } from '@arweqah-platform/shared';
import { NotFoundError } from '../../../common/domain/domain-error';
import { AUDIT_EVENT, type AuditEvent } from '../../audit/application/audit.events';
import { describeDevice, maskIp } from '../domain/device-description';
import { DeviceSecurityRepository } from '../domain/device-security.repository';

/** The sign-ins of a person: the list (with the current one marked), ending one, and ending all the others. */
@Injectable()
export class SessionsService {
  constructor(
    private readonly devices: DeviceSecurityRepository,
    private readonly events: EventEmitter2,
  ) {}

  async list(userId: string, currentSessionId: string): Promise<SessionDto[]> {
    return (await this.devices.sessionsOf(userId, new Date())).map((s) => ({
      id: s.id,
      device: describeDevice(s.userAgent),
      ip: maskIp(s.ip),
      createdAt: s.createdAt.toISOString(),
      lastActiveAt: s.updatedAt.toISOString(),
      current: s.id === currentSessionId,
    }));
  }

  async end(userId: string, sessionId: string): Promise<void> {
    if (!(await this.devices.endSession(userId, sessionId))) throw new NotFoundError('Session', sessionId);
    this.audit(userId, 'auth.session_ended', {});
  }

  async endOthers(userId: string, currentSessionId: string): Promise<number> {
    const ended = await this.devices.endOtherSessions(userId, currentSessionId);
    if (ended) this.audit(userId, 'auth.sessions_ended', { count: ended });
    return ended;
  }

  private audit(userId: string, action: string, changes: Record<string, unknown>): void {
    const event: AuditEvent = { actorId: userId, action, entityType: 'user', entityId: userId, changes };
    this.events.emit(AUDIT_EVENT, event);
  }
}
