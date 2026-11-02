import { z } from 'zod';
import { authCodeSchema } from '../auth/schemas';

/** The security numbers an administrator sets from the settings page (no value is fixed in the code): name → default and limits. */
export const SECURITY_SETTINGS = {
  /** Days a device stays trusted after the code step that follows a Microsoft sign-in (0 = the choice is switched off). */
  trustedDeviceDays: { default: 0, min: 0, max: 365 },
  /** How many requests one address may make in a minute before it is told to wait (the sign-in routes have their own, stricter limit). */
  requestsPerMinute: { default: 600, min: 120, max: 100_000 },
} as const;
export type SecuritySettingKey = keyof typeof SECURITY_SETTINGS;
export const SECURITY_SETTING_KEYS = Object.keys(SECURITY_SETTINGS) as SecuritySettingKey[];

export type SecuritySettingsDto = Record<SecuritySettingKey, number>;

const field = (key: SecuritySettingKey) => z.number().int().min(SECURITY_SETTINGS[key].min).max(SECURITY_SETTINGS[key].max);
export const securitySettingsSchema = z.strictObject({ trustedDeviceDays: field('trustedDeviceDays'), requestsPerMinute: field('requestsPerMinute') });
export type SecuritySettingsInput = z.infer<typeof securitySettingsSchema>;

/** One sign-in of the person, as the security page shows it. */
export interface SessionDto {
  id: string;
  /** «Chrome on Windows», read from the browser's own words; empty when unknown. */
  device: string;
  /** The address with its last part hidden. */
  ip: string | null;
  createdAt: string;
  lastActiveAt: string;
  current: boolean;
}

/** A browser the person asked to trust after the code step that follows a Microsoft sign-in. */
export interface TrustedDeviceDto {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  current: boolean;
}

/** The code step: the six digits, and optionally trusting this browser. */
export const verifyCodeSchema = authCodeSchema.extend({ rememberDevice: z.boolean().optional() });
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;

/** At least two labels of letters, digits and inner hyphens (each up to 63 characters), the last of letters only. */
function isDomain(value: string): boolean {
  const labels = value.split('.');
  const inner = (l: string) => l.length >= 1 && l.length <= 63 && /^[a-z0-9-]+$/.test(l) && !l.startsWith('-') && !l.endsWith('-');
  const last = /^[a-z]{2,24}$/;
  return labels.length >= 2 && labels.slice(0, -1).every(inner) && last.test(labels[labels.length - 1] ?? '');
}

/** A work-e-mail domain such as `arweqah.sa` (lower case, no `@`). */
export const emailDomainSchema = z.string().trim().toLowerCase().max(120).refine(isDomain, 'Not a domain');

/** The domains work e-mails may use; an empty list means only the default domain (`DEFAULT_WORK_EMAIL_DOMAIN`). */
export const allowedEmailDomainsSchema = z.strictObject({ domains: z.array(emailDomainSchema).max(50) });
export type AllowedEmailDomainsInput = z.infer<typeof allowedEmailDomainsSchema>;
export interface AllowedEmailDomainsDto {
  domains: string[];
}

/** The domain of an address, lower case; empty when it has none. */
export const emailDomainOf = (email: string): string => email.slice(email.lastIndexOf('@') + 1).trim().toLowerCase();
