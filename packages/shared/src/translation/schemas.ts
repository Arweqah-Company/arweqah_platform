import { z } from 'zod';

/** One field is translated per request; a name or a short description, never a document. */
export const TRANSLATE_MAX_CHARS = 1000;

export const translateInputSchema = z.strictObject({ text: z.string().trim().min(1).max(TRANSLATE_MAX_CHARS) });
export type TranslateInput = z.infer<typeof translateInputSchema>;

/** Arabic in, English out. */
export interface TranslationDto {
  text: string;
}
