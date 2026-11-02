export interface SessionRow {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrustedDeviceRow {
  id: string;
  label: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date;
}

/** The sign-in sessions of a person and the browsers they trust. */
export abstract class DeviceSecurityRepository {
  abstract sessionsOf(userId: string, now: Date): Promise<SessionRow[]>;
  /** Ends one session of the person; false when it is not theirs or not there. */
  abstract endSession(userId: string, sessionId: string): Promise<boolean>;
  /** Ends every session of the person except one; says how many ended. */
  abstract endOtherSessions(userId: string, keepSessionId: string): Promise<number>;
  abstract addTrusted(input: { userId: string; tokenHash: string; label: string; expiresAt: Date }): Promise<string>;
  /** The trusted device that goes with this secret, if it has not expired; marks it used. */
  abstract useTrusted(userId: string, tokenHash: string, now: Date): Promise<TrustedDeviceRow | null>;
  abstract trustedOf(userId: string, now: Date): Promise<(TrustedDeviceRow & { tokenHash: string })[]>;
  abstract removeTrusted(userId: string, id: string): Promise<boolean>;
  abstract removeAllTrusted(userId: string): Promise<void>;
}
