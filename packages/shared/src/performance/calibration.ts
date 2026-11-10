import { z } from 'zod';
import type { CycleStage } from './cycle';

/**
 * Calibration (FR-122; plan §3.6b): the holder of the calibration key compares the managers' scores and moves one by half-point steps, always with a written reason.
 */
export const CALIBRATION_STEP = 0.5;
export const CALIBRATION_MAX = 10;
export const CALIBRATION_REASON_MIN = 5;
export const CALIBRATION_REASON_MAX = 500;

/** The calibrated score: the manager's score plus the adjustment, rounded to one decimal, never below 0 or above the cap of the stage. */
export const calibratedScore = (managerScore: number, adjustment: number, cap: number): number =>
  Math.min(cap, Math.max(0, Math.round((managerScore + adjustment) * 10) / 10));

/** True when the value is a multiple of the step (floating point safe: 0.5 is exact in binary). */
export const onCalibrationStep = (value: number): boolean => Math.abs(value) <= CALIBRATION_MAX && Number.isInteger(value / CALIBRATION_STEP);

/** `PUT /performance/calibration/:employeeId`: a reason is required for any adjustment other than zero; zero clears it. */
export const adjustCalibrationSchema = z
  .strictObject({
    adjustment: z.number().refine(onCalibrationStep),
    reason: z.string().trim().max(CALIBRATION_REASON_MAX).default(''),
  })
  .refine((v) => v.adjustment === 0 || v.reason.length >= CALIBRATION_REASON_MIN, { path: ['reason'] });
export type AdjustCalibrationInput = z.infer<typeof adjustCalibrationSchema>;

export const CALIBRATION_ADJUSTED = ['yes', 'no'] as const;
export const calibrationQuerySchema = z.strictObject({
  search: z.string().trim().max(100).optional(),
  level: z.string().trim().max(100).optional(),
  stage: z.coerce.number().int().min(1).max(5).optional(),
  adjusted: z.enum(CALIBRATION_ADJUSTED).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type CalibrationQuery = z.infer<typeof calibrationQuerySchema>;

export interface CalibrationRowDto {
  employeeId: string;
  name: string;
  titleNameAr: string | null;
  titleNameEn: string | null;
  managerName: string | null;
  stage: number;
  /** The cap of the person's stage: the calibrated score never goes above it. */
  cap: number;
  /** Null while the managers' evaluation was not sent: the person cannot be calibrated yet. */
  managerScore: number | null;
  adjustment: number;
  reason: string | null;
  calibrated: number | null;
  levelName: string | null;
}

export interface CalibrationDistributionDto {
  levelName: string;
  count: number;
}

export interface CalibrationPageDto {
  cycle: { fiscalYear: number; stage: CycleStage } | null;
  items: CalibrationRowDto[];
  total: number;
  page: number;
  pageSize: number;
  /** Everyone in the cycle by level of the calibrated score, in the order of the grade scale (not only the page). */
  distribution: CalibrationDistributionDto[];
  /** How many have no sent manager evaluation yet; calibration cannot be finished while it is above zero. */
  waitingCount: number;
}
