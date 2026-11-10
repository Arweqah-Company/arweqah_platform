import { z } from 'zod';
import { changeReasonSchema } from './unit-charter';
import type { ManagementMode } from './unit-types';

/**
 * Leaders of a unit per company, and acting leaders (FR-100, plan 2.5).
 * A shared unit has one leader, from the group company; a unit managed per company has one leader per company, who belongs to it.
 * An acting leader covers a window and only while a leader exists.
 */
export const LEADER_KINDS = ['leader', 'acting'] as const;
export type LeaderKind = (typeof LEADER_KINDS)[number];

/**
 * `PUT /org/nodes/:id/leaders`: makes `employeeId` the leader (or the acting leader) of the unit for `companyId` from `validFrom` (today or later).
 * A new leader closes the previous one the day before. An acting leader needs both ends of the window.
 */
export const setLeaderSchema = z
  .strictObject({
    companyId: z.uuid(),
    employeeId: z.uuid(),
    kind: z.enum(LEADER_KINDS).default('leader'),
    /** The job title of the unit the leader takes: a leader (not an acting one) is placed in the unit with it from `validFrom`. Optional for the API; the screen always asks for it. */
    jobTitleId: z.uuid().optional(),
    validFrom: z.iso.date(),
    validTo: z.iso.date().nullable().optional(),
    reason: changeReasonSchema,
  })
  .refine((v) => !v.validTo || v.validTo >= v.validFrom, { path: ['validTo'], message: 'The end cannot be before the start' });
export type SetLeaderInput = z.infer<typeof setLeaderSchema>;

/** `POST /org/nodes/:id/leaders/:leaderId/end`: ends a leader that is in force, from `endDate` (today or later, the last day). */
export const endLeaderSchema = z.strictObject({ endDate: z.iso.date(), reason: changeReasonSchema });
export type EndLeaderInput = z.infer<typeof endLeaderSchema>;

export const leaderParamSchema = z.strictObject({ id: z.uuid(), leaderId: z.uuid() });

export type LeaderStatus = 'past' | 'current' | 'scheduled';

export interface OrgNodeLeaderDto {
  id: string;
  nodeId: string;
  companyId: string;
  companyNameAr: string;
  companyNameEn: string;
  employeeId: string;
  employeeName: string;
  kind: LeaderKind;
  validFrom: string;
  validTo: string | null;
  status: LeaderStatus;
  reason: string;
}

/** The person that stands in for a missing leader: the nearest unit above that has one for the company. */
export interface LeaderEscalationDto {
  nodeId: string;
  nodeNameAr: string;
  nodeNameEn: string;
  employeeId: string;
  employeeName: string;
}

/** One company of a unit: its people there, who leads it for them, and where the manager goes when nobody does. */
export interface OrgLeaderCompanyDto {
  companyId: string;
  nameAr: string;
  nameEn: string;
  /** Direct employees of the company in this unit. */
  staffCount: number;
  leader: OrgNodeLeaderDto | null;
  acting: OrgNodeLeaderDto | null;
  /** Set when the company has employees here and no leader; null when it has a leader or nobody above leads for it. */
  escalatesTo: LeaderEscalationDto | null;
}

export interface OrgNodeLeadersDto {
  nodeId: string;
  effectiveMode: ManagementMode;
  groupCompanyId: string;
  /** Every row of the unit, newest start first (past ones included). */
  items: OrgNodeLeaderDto[];
  /** Companies with employees or a leader in the unit (the group company always, for a shared unit). */
  companies: OrgLeaderCompanyDto[];
}

/** The leaders in force today, in the tree. */
export interface OrgTreeLeaderDto {
  employeeId: string;
  name: string;
  kind: LeaderKind;
  companyId: string;
}
