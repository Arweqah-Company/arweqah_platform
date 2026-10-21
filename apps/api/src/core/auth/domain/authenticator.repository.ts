export interface AuthenticatorRecord {
  userId: string;
  secretEnc: string;
  enabledAt: Date | null;
  lastUsedStep: number | null;
  failedCount: number;
  lockedUntil: Date | null;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  locale: 'ar' | 'en';
  isActive: boolean;
}

export interface InviteRecord {
  id: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
}

export abstract class AuthenticatorRepository {
  abstract userById(id: string): Promise<AuthUser | null>;
  abstract userByEmail(email: string): Promise<AuthUser | null>;
  abstract find(userId: string): Promise<AuthenticatorRecord | null>;
  /** Starts (or restarts) an enrollment; never replaces an enabled authenticator. */
  abstract savePending(userId: string, secretEnc: string): Promise<void>;
  abstract enable(userId: string, step: number, backupCodeHashes: string[]): Promise<void>;
  abstract recordSuccess(userId: string, step: number | null): Promise<void>;
  /** Counts a failed attempt and locks the authenticator once `maxFailures` is reached. */
  abstract recordFailure(userId: string, limit: { maxFailures: number; lockMs: number }): Promise<void>;
  /** Marks one unused backup code as used; false when it does not exist or was used. */
  abstract useBackupCode(userId: string, codeHash: string): Promise<boolean>;
  abstract remove(userId: string): Promise<void>;
  abstract replaceInvite(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  abstract findInvite(tokenHash: string): Promise<InviteRecord | null>;
  abstract markInviteUsed(inviteId: string): Promise<void>;
  abstract markSessionVerified(sessionId: string, userId: string): Promise<void>;
}
