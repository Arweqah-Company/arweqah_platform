import { z } from 'zod';
import type { PermissionScope } from '../permissions/scope';

/** What was given to a person outside what their job title, the Employee role and their place bring: a manual role, a permission of their own, or a group of roles. */
export const EXCEPTION_KINDS = ['role', 'permission', 'role-group'] as const;
export type ExceptionKind = (typeof EXCEPTION_KINDS)[number];

export interface AccessExceptionDto {
  kind: ExceptionKind;
  userId: string;
  userName: string;
  /** The role or group id, or the permission key. */
  targetId: string;
  targetNameAr: string;
  targetNameEn: string;
  /** How far a permission reaches; null for roles and groups. */
  scope: PermissionScope | null;
  grantedById: string | null;
  grantedByName: string | null;
  grantedAt: string;
  /** The last day it holds; null = no end date. */
  expiresAt: string | null;
}

/** Where a row of the list is found: who has it, and what it is. */
export const exceptionRefSchema = z.strictObject({ kind: z.enum(EXCEPTION_KINDS), userId: z.uuid(), targetId: z.string().min(1).max(100) });
export type ExceptionRef = z.infer<typeof exceptionRefSchema>;

/** A new last day (today or later), or null to remove the end date. */
export const setExceptionExpirySchema = z.strictObject({ expiresAt: z.iso.date().nullable() });
export type SetExceptionExpiryInput = z.infer<typeof setExceptionExpirySchema>;

/** The days given to roles when they are given to one person: role id → last day (a role left out keeps what it had). */
export const roleExpiriesSchema = z.record(z.uuid(), z.iso.date().nullable());
export type RoleExpiries = z.infer<typeof roleExpiriesSchema>;
