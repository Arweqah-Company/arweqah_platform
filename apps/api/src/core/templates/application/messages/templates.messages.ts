export const AUDIT = {
  saved: 'template.saved',
  submitted: 'template.submitted',
  approved: 'template.approved',
  rejected: 'template.rejected',
  reset: 'template.reset',
  settingsChanged: 'template.settings_changed',
} as const;

/** The live wording is read on every message sent; it is kept for a short time and dropped whenever it changes. */
export const LIVE_CACHE_MS = 30_000;
