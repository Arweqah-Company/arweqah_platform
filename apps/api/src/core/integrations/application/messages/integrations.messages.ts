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
/** An AI service may think for a while and a busy free one is tried again twice; still under the 60 s a proxy waits. */
export const AI_TEST_TIMEOUT_MS = 55_000;

/** A title file can take a few minutes to read (the proxies wait 300 s); a probe is a few words and the dashboard's own timeout cuts it short. */
export const AI_TIMEOUT_MS = 280_000;
/** Listing the models is a short request; both the SDK and the list route give up after this. */
export const MODELS_TIMEOUT_MS = 15_000;
export const AI_PROBE_MAX_TOKENS = 2_048;

export const CAPTCHA_AUDIT_UNAVAILABLE = 'captcha.unavailable';
export const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
export const CAPTCHA_TIMEOUT_MS = 4_000;
