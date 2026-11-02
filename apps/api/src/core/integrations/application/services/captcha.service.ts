import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { CaptchaConfigDto } from '@arweqah-platform/shared';
import { AUDIT_EVENT, type AuditEvent } from '../../../audit/application/audit.events';
import { CaptchaVerifier } from '../../domain/contracts/captcha-verifier';
import { CaptchaFailedError } from '../../domain/errors/integrations.errors';
import { CAPTCHA_AUDIT_UNAVAILABLE } from '../messages/integrations.messages';
import { ActiveProviders } from './active-providers.service';

/**
 * The bot check of the sign-in page. With no active provider nothing is asked (sign-in works before any key is entered);
 * with one, the answer of the widget is checked before anything is sent. When Cloudflare itself cannot be reached the
 * person is let in and the audit says so: an outage of the check must not lock everyone out.
 */
@Injectable()
export class CaptchaService {
  constructor(
    private readonly active: ActiveProviders,
    private readonly verifier: CaptchaVerifier,
    private readonly events: EventEmitter2,
  ) {}

  /** What the sign-in page needs: the public site key of the active provider, never the secret. */
  async config(): Promise<CaptchaConfigDto> {
    const provider = await this.active.of('captcha');
    const siteKey = provider?.values.siteKey;
    return provider && typeof siteKey === 'string' ? { provider: 'turnstile', siteKey } : { provider: null, siteKey: null };
  }

  async assert(token: string | undefined, ip: string | null): Promise<void> {
    const provider = await this.active.of('captcha');
    if (!provider) return;
    const secret = provider.values.secretKey;
    if (!token || typeof secret !== 'string') throw new CaptchaFailedError();
    const verdict = await this.verifier.verify(secret, token, ip);
    if (verdict === 'rejected') throw new CaptchaFailedError();
    if (verdict === 'unavailable') this.audit(ip);
  }

  private audit(ip: string | null): void {
    const event: AuditEvent = { actorId: null, action: CAPTCHA_AUDIT_UNAVAILABLE, entityType: 'integration.captcha', entityId: 'turnstile', changes: null, ip };
    this.events.emit(AUDIT_EVENT, event);
  }
}
