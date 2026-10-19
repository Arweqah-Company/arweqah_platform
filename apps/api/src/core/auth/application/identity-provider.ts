/**
 * Account operations the rest of the system needs from the authentication
 * library. Implemented by the Better Auth adapter; nothing else imports Better Auth.
 */
export abstract class IdentityProvider {
  abstract createUser(input: { name: string; email: string; locale: 'ar' | 'en'; password?: string }): Promise<string>;
  abstract setPassword(userId: string, password: string): Promise<void>;
  abstract revokeAllSessions(userId: string): Promise<void>;
}

/** Called by the auth library; implemented in the users/audit modules via callbacks. */
export interface AuthLifecycle {
  isActive(userId: string): Promise<boolean>;
  onSignIn(userId: string, ip: string | null): void;
}
