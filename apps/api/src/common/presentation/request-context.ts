import type { Request } from 'express';

/** Shape Better Auth attaches to the request (see core/auth). */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: SessionUser;
  session?: {
    session: {
      id: string;
      mfaVerifiedAt?: Date | string | null;
      /** Set when a platform administrator is working as this person («sign in as»). */
      impersonatedByUserId?: string | null;
      impersonatorSessionId?: string | null;
      impersonationLastActivityAt?: Date | string | null;
      createdAt?: Date | string;
    };
    user: SessionUser;
  };
}
