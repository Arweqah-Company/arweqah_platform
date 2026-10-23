import type { AdminModeState } from './admin-mode.rules';

/** Admin mode is a property of a session, so it ends with the session (sign-out, expiry, deactivation). */
export abstract class AdminModeRepository {
  abstract find(sessionId: string): Promise<AdminModeState | null>;
  abstract activate(sessionId: string, userId: string, at: Date): Promise<void>;
  abstract touch(sessionId: string, at: Date): Promise<void>;
  abstract deactivate(sessionId: string): Promise<void>;
}
