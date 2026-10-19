import { z } from 'zod';

/** A label stored in both UI languages. */
export const localizedNameSchema = {
  nameAr: z.string().trim().min(2).max(120),
  nameEn: z.string().trim().min(2).max(120),
};

export const uuidParamSchema = z.strictObject({ id: z.uuid() });
