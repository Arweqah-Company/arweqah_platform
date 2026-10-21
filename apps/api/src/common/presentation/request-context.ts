import type { Request } from 'express';

/** Shape Better Auth attaches to the request (see core/auth). */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: SessionUser;
  session?: { session: { id: string; mfaVerifiedAt?: Date | string | null }; user: SessionUser };
}
