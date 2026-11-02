import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SECURITY_SETTINGS, SECURITY_SETTING_KEYS, type SecuritySettingKey, type SecuritySettingsDto, type SecuritySettingsInput } from '@arweqah-platform/shared';
import { AUDIT_EVENT, type AuditEvent } from '../../audit/application/audit.events';
import { SecuritySettingsRepository } from '../domain/security-settings.repository';

const CACHE_MS = 15_000;

/** The security numbers: what the administrator set, or the default of `SECURITY_SETTINGS` (read often, so kept for a few seconds). */
@Injectable()
export class SecuritySettingsService {
  private cache: { values: SecuritySettingsDto; expiresAt: number } | null = null;

  constructor(
    private readonly repo: SecuritySettingsRepository,
    private readonly events: EventEmitter2,
  ) {}

  async all(): Promise<SecuritySettingsDto> {
    if (this.cache && this.cache.expiresAt > Date.now()) return this.cache.values;
    const saved = await this.repo.all();
    const values = Object.fromEntries(SECURITY_SETTING_KEYS.map((key) => [key, saved.get(key) ?? SECURITY_SETTINGS[key].default])) as SecuritySettingsDto;
    this.cache = { values, expiresAt: Date.now() + CACHE_MS };
    return values;
  }

  /** Forgets what was read, so the next read asks the database (after a change made behind the service's back). */
  invalidate(): void {
    this.cache = null;
  }

  async get(key: SecuritySettingKey): Promise<number> {
    return (await this.all())[key];
  }

  async update(input: SecuritySettingsInput, actorId: string): Promise<SecuritySettingsDto> {
    await this.repo.set(input, actorId);
    this.cache = null;
    const event: AuditEvent = { actorId, action: 'security.settings_updated', entityType: 'security_settings', entityId: 'security', changes: input };
    this.events.emit(AUDIT_EVENT, event);
    return this.all();
  }
}
