/** A session of someone working as another employee, as the «sign in as» rules need it. */
export interface ImpersonationSession {
  id: string;
  userId: string;
  impersonatedBy: string;
  impersonatorSessionId: string;
  startedAt: Date;
}

/** The sessions and accounts «sign in as» reads and ends (the session columns live in `auth_sessions`). */
export abstract class ImpersonationRepository {
  /** Name and whether the account is active; null when there is no such account. */
  abstract accountOf(userId: string): Promise<{ name: string; isActive: boolean } | null>;
  abstract find(sessionId: string): Promise<ImpersonationSession | null>;
  /** The token of the administrator's own session, to sign them back in; null when that session is gone or expired. */
  abstract tokenOfLiveSession(sessionId: string, now: Date): Promise<string | null>;
  abstract touch(sessionId: string, at: Date): Promise<void>;
  abstract end(sessionId: string): Promise<void>;
}
