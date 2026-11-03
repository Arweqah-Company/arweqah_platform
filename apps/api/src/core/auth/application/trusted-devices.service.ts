import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { TrustedDeviceDto } from '@arweqah-platform/shared';
import { NotFoundError } from '../../../common/domain/domain-error';
import { AUDIT_EVENT, type AuditEvent } from '../../audit/application/audit.events';
import { describeDevice } from '../domain/device-description';
import { DeviceSecurityRepository } from '../domain/device-security.repository';
import { SecuritySettingsService } from './security-settings.service';

const DAY_MS = 86_400_000;
const hash = (secret: string): string => createHash('sha256').update(secret).digest('hex');

/**
 * Browsers a person trusts after the code step that follows a Microsoft sign-in, so that step is skipped there for as many days as the
 * administrator allows. The e-mail sign-in is not skipped: the code is its only proof. The secret lives in an HttpOnly cookie; only its hash is kept.
 */
@Injectable()
export class TrustedDevicesService {
  constructor(
    private readonly devices: DeviceSecurityRepository,
    private readonly settings: SecuritySettingsService,
    private readonly events: EventEmitter2,
  ) {}

  /** Does the administrator allow trusting a browser (days above 0)? */
  async enabled(): Promise<boolean> {
    return (await this.settings.get('trustedDeviceDays')) > 0;
  }

  /** Trusts this browser when the administrator allows it (days above 0); returns the secret for the cookie and how long it lasts, or null. */
  async trust(userId: string, userAgent: string | null): Promise<{ secret: string; days: number } | null> {
    const days = await this.settings.get('trustedDeviceDays');
    if (days <= 0) return null;
    const secret = randomBytes(32).toString('base64url');
    await this.devices.addTrusted({ userId, tokenHash: hash(secret), label: describeDevice(userAgent), expiresAt: new Date(Date.now() + days * DAY_MS) });
    this.audit(userId, 'auth.trusted_device.added');
    return { secret, days };
  }

  /** Is this secret a trusted device of the person, still valid? (Used by the code step after Microsoft.) */
  async accepts(userId: string, secret: string | undefined): Promise<boolean> {
    if (!secret || (await this.settings.get('trustedDeviceDays')) <= 0) return false;
    const found = await this.devices.useTrusted(userId, hash(secret), new Date());
    if (found) this.audit(userId, 'auth.trusted_device.used');
    return !!found;
  }

  async list(userId: string, currentSecret: string | undefined): Promise<TrustedDeviceDto[]> {
    const currentHash = currentSecret ? hash(currentSecret) : null;
    return (await this.devices.trustedOf(userId, new Date())).map((d) => ({
      id: d.id,
      label: d.label,
      createdAt: d.createdAt.toISOString(),
      lastUsedAt: d.lastUsedAt?.toISOString() ?? null,
      expiresAt: d.expiresAt.toISOString(),
      current: d.tokenHash === currentHash,
    }));
  }

  async remove(userId: string, id: string): Promise<void> {
    if (!(await this.devices.removeTrusted(userId, id))) throw new NotFoundError('Trusted device', id);
    this.audit(userId, 'auth.trusted_device.removed');
  }

  private audit(userId: string, action: string): void {
    const event: AuditEvent = { actorId: userId, action, entityType: 'user', entityId: userId };
    this.events.emit(AUDIT_EVENT, event);
  }
}
