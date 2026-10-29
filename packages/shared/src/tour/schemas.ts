import { z } from 'zod';
import { TOUR_IDS, TOUR_STEP_KEYS } from './catalog';
import type { TourId, TourStepKey } from './catalog';
import type { HideablePage } from '../pages/schemas';

export const TOUR_TITLE_MAX = 80;
export const TOUR_BODY_MAX = 400;

export const tourIdSchema = z.enum(TOUR_IDS);
export const tourStepKeySchema = z.enum(TOUR_STEP_KEYS);

/** Empty text means «use the wording in the code», the same as null. */
const optionalText = (max: number) => z.string().trim().max(max).nullable().transform((v) => (v ? v : null));

/** One step's wording (null = the default from the code) and whether it is shown. */
export const tourStepEditSchema = z.strictObject({
  enabled: z.boolean(),
  titleAr: optionalText(TOUR_TITLE_MAX),
  titleEn: optionalText(TOUR_TITLE_MAX),
  bodyAr: optionalText(TOUR_BODY_MAX),
  bodyEn: optionalText(TOUR_BODY_MAX),
});
export type TourStepEditInput = z.infer<typeof tourStepEditSchema>;

/** The steps of one tour in their new order: every step of that tour, once. */
export const tourOrderSchema = z.strictObject({ tour: tourIdSchema, keys: z.array(tourStepKeySchema).min(1).max(TOUR_STEP_KEYS.length) });
export type TourOrderInput = z.infer<typeof tourOrderSchema>;

export type TourStatus = 'none' | 'completed' | 'skipped';

/** What the person's tour plays: the steps they may see, in order, with the administrator's wording (null = the default). */
export interface TourStepDto {
  key: TourStepKey;
  titleAr: string | null;
  titleEn: string | null;
  bodyAr: string | null;
  bodyEn: string | null;
}

export interface TourDto {
  tour: TourId;
  status: TourStatus;
  steps: TourStepDto[];
  /** Steps this person has not seen yet (only when they finished or skipped the tour before): the «what's new» tour. */
  newSteps: TourStepKey[];
}

/** One row of the settings list. */
export interface TourStepSettingDto extends TourStepDto {
  tour: TourId;
  order: number;
  enabled: boolean;
  permission: string | null;
  page: HideablePage | null;
  /** The wording or the switch differs from the code. */
  customised: boolean;
  updatedAt: string | null;
}

export interface TourStepsDto {
  steps: TourStepSettingDto[];
}
