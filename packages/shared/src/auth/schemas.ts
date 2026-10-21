import { z } from 'zod';
import type { PermissionScope } from '../permissions/scope';

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

/** Sign in with a work e-mail and an authenticator code (no password). */
export const totpSignInSchema = z.strictObject({ email: z.email().max(254), code: z.string().trim().min(6).max(12) });
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

/** The signed-in user as returned by GET /api/me. */
export interface UserDto {
  id: string;
  name: string;
  email: string;
  locale: 'ar' | 'en';
  isActive: boolean;
  /** An authenticator app is linked to this account. */
  authenticatorEnabled: boolean;
  roles: { id: string; nameAr: string; nameEn: string }[];
  placement: PlacementInput;
  createdAt: string;
}

export interface MeDto extends UserDto {
  /** The code of the authenticator app was entered for this session; every other route is blocked until then. */
  mfaVerified: boolean;
  permissions: { key: string; scope: PermissionScope }[];
}
