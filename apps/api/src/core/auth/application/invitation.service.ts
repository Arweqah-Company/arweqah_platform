import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../../config/app-config.service';
import { MailSender } from '../../notifications/application/notification-channel';
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
  ) {}

  /** Issues a fresh link (older unused ones stop working) and e-mails it. */
  async invite(userId: string): Promise<InviteResult> {
    const user = await this.repo.userById(userId);
    if (!user) throw new NotFoundError('User', userId);
    const token = randomBytes(32).toString('base64url');
    await this.repo.replaceInvite(userId, hashToken(token), new Date(Date.now() + INVITE_TTL_MS));
    const url = `${this.config.get('APP_URL')}/enroll/${token}`;
    await this.mail.send({ purpose: 'activation', to: user.email, subject: subjectFor(user.locale), text: textFor(user.locale, user.name, url), html: htmlFor(user.locale, user.name, url, this.config.get('APP_URL')) });
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

const subjectFor = (locale: 'ar' | 'en'): string => (locale === 'en' ? 'Activate your Arweqah account' : 'فعّل حسابك في منصة أروقة');

function textFor(locale: 'ar' | 'en', name: string, url: string): string {
  return locale === 'en'
    ? `Hello ${name},\n\nAn Arweqah Platform account was created for you. Open this link within 72 hours to link your authenticator app (Microsoft or Google Authenticator):\n${url}\n\nYou can also sign in with your Microsoft work account.`
    : `مرحبًا ${name}،\n\nتم إنشاء حساب لك في منصة أروقة. افتح الرابط التالي خلال 72 ساعة لربط تطبيق المصادقة (Microsoft أو Google Authenticator):\n${url}\n\nيمكنك أيضًا الدخول بحساب Microsoft الخاص بالعمل.`;
}

function htmlFor(locale: 'ar' | 'en', name: string, url: string, appUrl: string): string {
  const rtl = locale === 'ar';
  const body = textFor(locale, escapeHtml(name), '').split('\n\n');
  const cta = rtl ? 'ربط تطبيق المصادقة' : 'Link authenticator app';
  return `<div dir="${rtl ? 'rtl' : 'ltr'}" style="font-family:Tajawal,Arial,sans-serif;background:#FFFCEE;color:#0C2028;padding:24px">
<img src="${appUrl}/brand/logo-color-horizontal.png" alt="Arweqah" width="180" style="display:block;margin-bottom:24px">
<p>${body[0] ?? ''}</p><p>${(body[1] ?? '').replace(/\n.*$/s, '')}</p>
<p><a href="${url}" style="display:inline-block;background:#00415B;color:#FFFCEE;padding:12px 20px;border-radius:8px;text-decoration:none">${cta}</a></p>
<p style="font-size:13px;color:#556263">${body[2] ?? ''}</p></div>`;
}

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
