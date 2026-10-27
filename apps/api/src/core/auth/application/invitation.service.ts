import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../../config/app-config.service';
import { INVITATION_TEMPLATE } from '../../notifications/application/email-templates';
import { MailSender } from '../../notifications/application/notification-channel';
import { TemplateRenderer } from '../../templates/application/services/template-renderer';
import { AuthenticatorRepository } from '../domain/authenticator.repository';
import { InvitationInvalidError } from '../domain/errors';
import { hashToken } from '../domain/totp';
import { NotFoundError } from '../../../common/domain/domain-error';

const INVITE_TTL_MS = 72 * 60 * 60 * 1000;
/** One activation request per e-mail per window, so the form cannot be used to flood a mailbox. */
const REQUEST_COOLDOWN_MS = 60 * 1000;

export interface InviteResult {
  sentTo: string;
  /** Returned outside production so an invitation can be tried without e-mail. */
  enrollmentUrl?: string;
}

/** One-time links that let a new employee scan the QR code and enroll their authenticator app. */
@Injectable()
export class InvitationService {
  private readonly lastRequest = new Map<string, number>();

  constructor(
    private readonly repo: AuthenticatorRepository,
    private readonly mail: MailSender,
    private readonly config: AppConfig,
    private readonly templates: TemplateRenderer,
  ) {}

  /** Issues a fresh link (older unused ones stop working) and e-mails it. */
  async invite(userId: string): Promise<InviteResult> {
    const user = await this.repo.userById(userId);
    if (!user) throw new NotFoundError('User', userId);
    const token = randomBytes(32).toString('base64url');
    await this.repo.replaceInvite(userId, hashToken(token), new Date(Date.now() + INVITE_TTL_MS));
    const url = `${this.config.get('APP_URL')}/enroll/${token}`;
    const mail = await this.templates.renderEmail(INVITATION_TEMPLATE, user.locale, { name: user.name, link: url });
    await this.mail.send({ purpose: 'activation', to: user.email, subject: mail.subject, text: mail.text, html: mail.html });
    return { sentTo: user.email, enrollmentUrl: this.config.isProduction ? undefined : url };
  }

  /**
   * Called when an e-mail is typed on the sign-in page. For an active account with no authenticator yet it e-mails the
   * activation link (QR code) and answers `firstTime`. Unknown, inactive and enrolled addresses all answer the same
   * `false`, so only "this is a new, active account" is revealed, and only the mailbox owner receives anything.
   */
  async identify(email: string): Promise<{ firstTime: boolean }> {
    const key = email.trim().toLowerCase();
    const user = await this.repo.userByEmail(key);
    if (!user?.isActive || (await this.repo.find(user.id))?.enabledAt) return { firstTime: false };
    const last = this.lastRequest.get(key) ?? 0;
    if (Date.now() - last >= REQUEST_COOLDOWN_MS) {
      this.lastRequest.set(key, Date.now());
      await this.invite(user.id).catch((error: unknown) => {
        this.lastRequest.delete(key);
        throw error;
      });
    }
    return { firstTime: true };
  }

  /** The user a valid, unused, unexpired link belongs to. Anything else is the same "not found". */
  async resolve(token: string): Promise<{ userId: string; inviteId: string }> {
    const invite = await this.repo.findInvite(hashToken(token));
    if (!invite || invite.usedAt || invite.expiresAt.getTime() < Date.now()) throw new InvitationInvalidError();
    return { userId: invite.userId, inviteId: invite.id };
  }

  consume(inviteId: string): Promise<void> {
    return this.repo.markInviteUsed(inviteId);
  }
}
