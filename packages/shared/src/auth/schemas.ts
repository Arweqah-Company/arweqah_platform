import type { ListSettingsDto } from '../lists/catalog';
import type { HideablePage } from '../pages/schemas';
import { z } from 'zod';

/** Where the signed-in user sits: company, org unit and direct manager (from the employee record). */
export const placementSchema = z.strictObject({
  companyId: z.uuid().nullable(),
  orgNodeId: z.uuid().nullable(),
  managerId: z.uuid().nullable(),
});
export type PlacementInput = z.infer<typeof placementSchema>;

/** A 6-digit code from the authenticator app, or a backup code such as "K7MQ2-X9PD4". */
export const authCodeSchema = z.strictObject({ code: z.string().trim().min(6).max(12) });
export type AuthCodeInput = z.infer<typeof authCodeSchema>;

/** A fresh 6-digit code from the authenticator app (backup codes are not accepted here). */
export const adminModeActivateSchema = z.strictObject({ code: z.string().trim().regex(/^\d{6}$/) });
export type AdminModeActivateInput = z.infer<typeof adminModeActivateSchema>;

/** Platform admin mode switches off by itself after this many minutes without admin activity. */
export const ADMIN_MODE_IDLE_MINUTES = 30;

/** Whether the person may use platform admin mode, and whether it is on in this session. */
export interface AdminModeDto {
  available: boolean;
  active: boolean;
  /** When it switches off if nothing admin-related happens; moves forward with each admin action. */
  expiresAt: string | null;
}

/** Sign in with a work e-mail and an authenticator code (no password). */
export const totpSignInSchema = z.strictObject({ email: z.email().max(254), code: z.string().trim().min(6).max(12), rememberDevice: z.boolean().optional() });
export type TotpSignInInput = z.infer<typeof totpSignInSchema>;

/** What the QR code of an enrollment carries. */
export interface EnrollmentStartDto {
  email: string;
  /** The secret as text, for typing it into the app instead of scanning. */
  secret: string;
  /** otpauth:// URI to render as the QR code. */
  otpauthUri: string;
}

/** Shown once, right after the first code is confirmed. */
export interface BackupCodesDto {
  backupCodes: string[];
}

export const THEMES = ['light', 'dark', 'system'] as const;
export type Theme = (typeof THEMES)[number];

/** The signed-in user as returned by GET /api/me. */
export interface UserDto {
  id: string;
  name: string;
  email: string;
  locale: 'ar' | 'en';
  /** The interface theme the person chose; "system" follows the device. */
  theme: Theme;
  isActive: boolean;
  /** An authenticator app is linked to this account. */
  authenticatorEnabled: boolean;
  roles: { id: string; nameAr: string; nameEn: string }[];
  placement: PlacementInput;
  createdAt: string;
}

/** The session is a «sign in as»: a platform administrator working as this person. */
export interface ImpersonationDto {
  by: { id: string; name: string };
  startedAt: string;
  idleMinutes: number;
}

export interface MeDto extends UserDto {
  /** The code of the authenticator app was entered for this session; every other route is blocked until then. */
  mfaVerified: boolean;
  adminMode: AdminModeDto;
  /** Set only inside a «sign in as» session; null for a normal sign-in. */
  impersonation: ImpersonationDto | null;
  /** The administrator switched «sign in as» on in the security settings (the button shows only for those who hold its key). */
  impersonationEnabled: boolean;
  /** The administrator allows trusting a browser after the code step that follows a Microsoft sign-in. */
  trustedDevicesEnabled: boolean;
  /** Pages hidden from every role of this person (the menu leaves them out and the API refuses them). */
  hiddenPages: HideablePage[];
  /** What an administrator hid in the lists (columns and filters); one setting for everyone. */
  listSettings: ListSettingsDto;
}
