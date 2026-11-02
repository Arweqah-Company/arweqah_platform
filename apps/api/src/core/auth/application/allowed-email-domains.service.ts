import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DEFAULT_WORK_EMAIL_DOMAIN, emailDomainOf, isWorkEmail, type AllowedEmailDomainsDto } from '@arweqah-platform/shared';
import { AUDIT_EVENT, type AuditEvent } from '../../audit/application/audit.events';
import { AllowedEmailDomainsRepository } from '../domain/allowed-email-domains.repository';
import { EmailDomainNotAllowedError } from '../domain/errors-email-domain';

/** The domains work e-mails may use (set from the Security settings): while the list is empty only the default domain is allowed, as it always was. */
@Injectable()
export class AllowedEmailDomainsService {
  constructor(
    private readonly repo: AllowedEmailDomainsRepository,
    private readonly events: EventEmitter2,
  ) {}

  async list(): Promise<AllowedEmailDomainsDto> {
    return { domains: await this.repo.all() };
  }

  async replace(domains: string[], actorId: string): Promise<AllowedEmailDomainsDto> {
    const unique = [...new Set(domains)].sort();
    await this.repo.replace(unique, actorId);
    const event: AuditEvent = { actorId, action: 'security.email_domains_updated', entityType: 'security_settings', entityId: 'email_domains', changes: { domains: unique } };
    this.events.emit(AUDIT_EVENT, event);
    return { domains: unique };
  }

  /** Refuses an address whose domain is not on the list (the default domain while the list is empty). */
  async assertAllowed(email: string): Promise<void> {
    const saved = await this.repo.all();
    if (!isWorkEmail(email, saved.length ? saved : [DEFAULT_WORK_EMAIL_DOMAIN])) throw new EmailDomainNotAllowedError(emailDomainOf(email));
  }
}
