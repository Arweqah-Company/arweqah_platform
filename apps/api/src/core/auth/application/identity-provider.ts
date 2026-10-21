/**
 * Account operations the rest of the system needs from the authentication
 * library. Implemented by the Better Auth adapter; nothing else imports Better Auth.
 * There are no passwords: people sign in with Microsoft or with their e-mail and an authenticator code.
 */
export abstract class IdentityProvider {
  abstract createUser(input: { name: string; email: string; locale: 'ar' | 'en' }): Promise<string>;
  abstract revokeAllSessions(userId: string): Promise<void>;
  /** Enables or disables sign-in for the account; disabling ends every session. */
  abstract setActive(userId: string, active: boolean): Promise<void>;
  /** Removes an account created moments ago whose employee record could not be saved. */
  abstract deleteUser(userId: string): Promise<void>;
}

/** Called by the auth library; implemented by PgAuthLifecycle (audit and the active-account check). */
export interface AuthLifecycle {
  isActive(userId: string): Promise<boolean>;
  onSignIn(userId: string, ip: string | null): void;
}
