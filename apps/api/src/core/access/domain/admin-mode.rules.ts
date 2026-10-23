import { ADMIN_MODE_IDLE_MINUTES } from '@arweqah-platform/shared';

export const ADMIN_MODE_IDLE_MS = ADMIN_MODE_IDLE_MINUTES * 60 * 1000;

/** What the session remembers about admin mode. Both null = it was never switched on (or was switched off). */
export interface AdminModeState {
  enabledAt: Date | null;
  lastActivityAt: Date | null;
}

/** When admin mode switches itself off: a fixed idle time after the last admin activity. Null when it is off. */
export function adminModeExpiry(state: AdminModeState | null, idleMs: number = ADMIN_MODE_IDLE_MS): Date | null {
  if (!state?.enabledAt || !state.lastActivityAt) return null;
  return new Date(state.lastActivityAt.getTime() + idleMs);
}

export function isAdminModeActive(state: AdminModeState | null, now: Date, idleMs: number = ADMIN_MODE_IDLE_MS): boolean {
  const expiry = adminModeExpiry(state, idleMs);
  return !!expiry && expiry.getTime() > now.getTime();
}
