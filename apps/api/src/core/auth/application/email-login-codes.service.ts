import { createHmac, randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppConfig } from '../../../config/app-config.service';
import { AUDIT_EVENT, type AuditEvent } from '../../audit/application/audit.events';
import { LOGIN_CODE_TEMPLATE } from '../../notifications/application/email-templates';
import { MailSender } from '../../notifications/application/notification-channel';
import { TemplateRenderer } from '../../templates/application/services/template-renderer';
import { AuthenticatorRepository } from '../domain/authenticator.repository';
import { EmailLoginCodeRepository } from '../domain/email-login-code.repository';

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_AFTER_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

/**
 * The e-mailed sign-in code: an alternative to the code of the authenticator app for a person who already linked it.
 * Six digits, valid 10 minutes, spent on first use, dead after 5 wrong tries, one new code a minute. Only an HMAC is stored.
 */
@Injectable()
export class EmailLoginCodesService {
  constructor(
    private readonly codes: EmailLoginCodeRepository,
    private readonly users: AuthenticatorRepository,
    private readonly mail: MailSender,
    private readonly templates: TemplateRenderer,
    private readonly config: AppConfig,
    private readonly events: EventEmitter2,
  ) {}

  /** E-mails a code to this address. Says nothing about whether the address exists, is active, has an app or asked too soon. */
  async sendTo(email: string): Promise<void> {
    const user = await this.users.userByEmail(email.trim().toLowerCase());
    if (user) await this.sendFor(user.id);
  }

  async sendFor(userId: string): Promise<void> {
    const user = await this.users.userById(userId);
    if (!user?.isActive || !(await this.users.find(userId))?.enabledAt) return;
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const now = new Date();
    const stored = await this.codes.issue({ userId, codeHash: this.hash(userId, code), expiresAt: new Date(now.getTime() + CODE_TTL_MS), now, cooldownMs: RESEND_AFTER_MS });
    if (!stored) return;
    const mail = await this.templates.renderEmail(LOGIN_CODE_TEMPLATE, user.locale, { name: user.name, code });
    await this.mail.send({ purpose: 'sign_in', to: user.email, subject: mail.subject, text: mail.text, html: mail.html });
    this.audit(userId, 'auth.email_code.sent');
  }

  /** True when the code is the one last e-mailed to the person, still valid; it cannot be used again. */
  async verify(userId: string, code: string): Promise<boolean> {
    if (!/^\d{6}$/.test(code.trim())) return false;
    const ok = await this.codes.consume({ userId, codeHash: this.hash(userId, code.trim()), now: new Date(), maxAttempts: MAX_ATTEMPTS });
    if (ok) this.audit(userId, 'auth.email_code.used');
    return ok;
  }

  /** Sign-in by e-mail and e-mailed code: the person's id, or null for every kind of failure. */
  async verifySignIn(email: string, code: string): Promise<string | null> {
    const user = await this.users.userByEmail(email.trim().toLowerCase());
    return user?.isActive && (await this.verify(user.id, code)) ? user.id : null;
  }

  private hash(userId: string, code: string): string {
    return createHmac('sha256', this.config.get('BETTER_AUTH_SECRET')).update(`${userId}:${code}`).digest('hex');
  }

  private audit(userId: string, action: string): void {
    const event: AuditEvent = { actorId: userId, action, entityType: 'user', entityId: userId };
    this.events.emit(AUDIT_EVENT, event);
  }
}
