export const AUDIT = {
  saved: 'integration.saved',
  tested: 'integration.tested',
  activated: 'integration.activated',
  deactivated: 'integration.deactivated',
} as const;

export const ACTIVE_CACHE_MS = 30_000;
export const TESTS_PER_MINUTE = 10;
export const TEST_WINDOW_MS = 60_000;
export const TEST_TIMEOUT_MS = 20_000;
