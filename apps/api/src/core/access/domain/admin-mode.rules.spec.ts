import { describe, expect, it } from 'vitest';
import { ADMIN_MODE_IDLE_MS, adminModeExpiry, isAdminModeActive } from './admin-mode.rules';

const at = (iso: string) => new Date(iso);
const on = { enabledAt: at('2026-10-23T08:00:00Z'), lastActivityAt: at('2026-10-23T08:10:00Z') };

describe('Platform admin mode rules (FR-34)', () => {
  it('is off when it was never switched on, or was switched off', () => {
    expect(adminModeExpiry(null)).toBeNull();
    expect(adminModeExpiry({ enabledAt: null, lastActivityAt: null })).toBeNull();
    expect(isAdminModeActive({ enabledAt: null, lastActivityAt: null }, at('2026-10-23T08:11:00Z'))).toBe(false);
  });

  it('switches itself off 30 minutes after the last admin activity, not after it was switched on', () => {
    expect(ADMIN_MODE_IDLE_MS).toBe(30 * 60 * 1000);
    expect(adminModeExpiry(on)?.toISOString()).toBe('2026-10-23T08:40:00.000Z');
    expect(isAdminModeActive(on, at('2026-10-23T08:39:59Z'))).toBe(true);
    expect(isAdminModeActive(on, at('2026-10-23T08:40:00Z'))).toBe(false);
    expect(isAdminModeActive(on, at('2026-10-23T09:00:00Z'))).toBe(false);
  });
});
