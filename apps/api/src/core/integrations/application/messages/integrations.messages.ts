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

export const CAPTCHA_AUDIT_UNAVAILABLE = 'captcha.unavailable';
export const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
export const CAPTCHA_TIMEOUT_MS = 4_000;
