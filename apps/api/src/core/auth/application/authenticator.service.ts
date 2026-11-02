import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FieldCipher } from '../../../common/application/field-cipher';
import { AUDIT_EVENT, type AuditEvent } from '../../audit/application/audit.events';
import { DeviceSecurityRepository } from '../domain/device-security.repository';
import { AuthenticatorRepository, type AuthenticatorRecord, type AuthUser } from '../domain/authenticator.repository';
import { AlreadyEnrolledError, AuthenticatorLockedError, InvalidCodeError, NoEnrollmentInProgressError } from '../domain/errors';
import {
  generateBackupCodes,
  generateSecret,
  hashBackupCode,
  looksLikeBackupCode,
  matchingStep,
  otpauthUri,
} from '../domain/totp';

const ISSUER = 'Arweqah Platform';
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;
/** Compared against when the account does not exist, so response time does not reveal it. */
const DECOY_SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';

export interface EnrollmentStart {
  secret: string;
  otpauthUri: string;
  email: string;
}

export type CodeResult = 'ok' | 'invalid' | 'locked';
/** `used`: the code is right but its time step was already accepted (not a failed attempt). */
export type FreshCodeResult = CodeResult | 'used';

@Injectable()
export class AuthenticatorService {
  constructor(
    private readonly repo: AuthenticatorRepository,
    private readonly devices: DeviceSecurityRepository,
    private readonly cipher: FieldCipher,
    private readonly events: EventEmitter2,
  ) {}

  async isEnabled(userId: string): Promise<boolean> {
    return !!(await this.repo.find(userId))?.enabledAt;
  }

  /** Generates the secret the user scans as a QR code. Safe to call again until the first code is confirmed. */
  async beginEnrollment(userId: string): Promise<EnrollmentStart> {
    const user = await this.mustUser(userId);
    if (await this.isEnabled(userId)) throw new AlreadyEnrolledError();
    const secret = generateSecret();
    await this.repo.savePending(userId, this.cipher.encrypt(secret));
    return { secret, email: user.email, otpauthUri: otpauthUri({ secret, account: user.email, issuer: ISSUER }) };
  }

  /** Confirms the first code from the app, enables the authenticator and returns the one-time backup codes. */
  async confirmEnrollment(userId: string, code: string): Promise<string[]> {
    const pending = await this.repo.find(userId);
    if (!pending || pending.enabledAt) throw new NoEnrollmentInProgressError();
    if (isLocked(pending)) throw new AuthenticatorLockedError();
    const step = matchingStep(this.cipher.decrypt(pending.secretEnc), code);
    if (step === null) {
      await this.repo.recordFailure(userId, { maxFailures: MAX_FAILURES, lockMs: LOCK_MS });
      throw new InvalidCodeError();
    }
    const backupCodes = generateBackupCodes();
    await this.repo.enable(userId, step, backupCodes.map(hashBackupCode));
    this.audit(userId, 'auth.authenticator.enabled');
    return backupCodes;
  }

  /** Checks a code from the app, or a backup code. A time step is accepted once; five failures lock the account for 15 minutes. */
  async verify(userId: string, code: string): Promise<CodeResult> {
    const record = await this.repo.find(userId);
    if (!record?.enabledAt) return 'invalid';
    if (isLocked(record)) return 'locked';
    const accepted = looksLikeBackupCode(code) ? await this.repo.useBackupCode(userId, hashBackupCode(code)) : await this.acceptTotp(record, code);
    if (!accepted) {
      await this.repo.recordFailure(userId, { maxFailures: MAX_FAILURES, lockMs: LOCK_MS });
      this.audit(userId, 'auth.code.failed');
      return 'invalid';
    }
    return 'ok';
  }

  /**
   * A fresh code from the app for a sensitive action (platform admin mode): backup codes are not accepted, a time step
   * that was already used answers `used` without counting as a failure, and wrong codes count toward the same lock as sign-in.
   */
  async verifyAppCode(userId: string, code: string): Promise<FreshCodeResult> {
    const record = await this.repo.find(userId);
    if (!record?.enabledAt || looksLikeBackupCode(code)) return 'invalid';
    if (isLocked(record)) return 'locked';
    const step = matchingStep(this.cipher.decrypt(record.secretEnc), code);
    if (step === null) {
      await this.repo.recordFailure(userId, { maxFailures: MAX_FAILURES, lockMs: LOCK_MS });
      this.audit(userId, 'auth.code.failed');
      return 'invalid';
    }
    if (record.lastUsedStep !== null && step <= record.lastUsedStep) return 'used';
    await this.repo.recordSuccess(userId, step);
    return 'ok';
  }

  /**
   * Sign-in by e-mail and code. The answer is the same for an unknown e-mail, a missing or locked
   * authenticator and a wrong code: nobody learns which accounts exist.
   */
  async verifySignIn(email: string, code: string): Promise<string | null> {
    const user = await this.repo.userByEmail(email.trim().toLowerCase());
    if (!user || !user.isActive) {
      matchingStep(DECOY_SECRET, code);
      return null;
    }
    return (await this.verify(user.id, code)) === 'ok' ? user.id : null;
  }

  /** Development seed only (refused in production by the env schema): links an app with a known secret. */
  async enableWithSecret(userId: string, secret: string): Promise<void> {
    await this.repo.savePending(userId, this.cipher.encrypt(secret));
    await this.repo.enable(userId, 0, generateBackupCodes().map(hashBackupCode));
  }

  /** Admin action: the employee must enroll again (lost phone). */
  async reset(userId: string, actorId: string): Promise<void> {
    await this.repo.remove(userId);
    // The trusted browsers vouched for the old app: they stop counting.
    await this.devices.removeAllTrusted(userId);
    this.audit(actorId, 'auth.authenticator.reset', userId);
  }

  async markSessionVerified(sessionId: string, userId: string): Promise<void> {
    await this.repo.markSessionVerified(sessionId, userId);
    this.audit(userId, 'auth.mfa.verified');
  }

  private async acceptTotp(record: AuthenticatorRecord, code: string): Promise<boolean> {
    const step = matchingStep(this.cipher.decrypt(record.secretEnc), code);
    if (step === null || (record.lastUsedStep !== null && step <= record.lastUsedStep)) return false;
    await this.repo.recordSuccess(record.userId, step);
    return true;
  }

  private async mustUser(userId: string): Promise<AuthUser> {
    const user = await this.repo.userById(userId);
    if (!user) throw new InvalidCodeError();
    return user;
  }

  private audit(actorId: string, action: string, entityId: string = actorId): void {
    const event: AuditEvent = { actorId, action, entityType: 'user', entityId };
    this.events.emit(AUDIT_EVENT, event);
  }
}

const isLocked = (record: AuthenticatorRecord): boolean => !!record.lockedUntil && record.lockedUntil.getTime() > Date.now();
