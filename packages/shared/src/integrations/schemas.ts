import { z } from 'zod';
import { TRANSLATE_MAX_CHARS } from '../translation/schemas';
import type { IntegrationKind, ProviderKey, ProviderValues } from './catalog';

const valuesSchema = z.record(z.string().max(60), z.union([z.string().max(8000), z.number(), z.boolean(), z.null()]));

/** Data of one provider. A blank (or null) value clears the field, except a blank secret, which keeps the saved one. */
export const saveProviderInputSchema = z.strictObject({ values: valuesSchema });
export type SaveProviderInput = z.infer<typeof saveProviderInputSchema>;

/** Try a provider with what is in the form (saved data fills what the form leaves blank). Translation sends `text`, e-mail sends `to`. */
export const testProviderInputSchema = z.strictObject({
  values: valuesSchema.optional(),
  text: z.string().trim().min(1).max(TRANSLATE_MAX_CHARS).optional(),
  to: z.email().max(254).optional(),
  /** The answer of the Turnstile widget shown in the test window (captcha). */
  captchaToken: z.string().trim().min(1).max(4096).optional(),
});
export type TestProviderInput = z.infer<typeof testProviderInputSchema>;

/** incomplete: data missing or wrong; untested: complete but not tried with this exact data; tested: tried and passed. */
export type ProviderStatus = 'incomplete' | 'untested' | 'tested';

export interface ProviderDto {
  kind: IntegrationKind;
  providerKey: ProviderKey;
  status: ProviderStatus;
  isActive: boolean;
  /** Everything except secrets. */
  values: ProviderValues;
  /** Secret fields that hold a value (the value itself never leaves the server). */
  secretsSet: string[];
  missing: string[];
  invalid: string[];
  testedAt: string | null;
  updatedAt: string | null;
}

export interface IntegrationCatalogDto {
  kind: IntegrationKind;
  providers: ProviderDto[];
  /** True when none is active and the server's own settings (.env) are doing the work. */
  usingServerSettings: boolean;
}

export interface TestResultDto {
  ok: boolean;
  /** Why it failed, as the provider reported it. */
  message: string | null;
  /** The translation, for a translation test. */
  text: string | null;
}

/** The models an AI service offers to a key (`POST /integrations/ai/:providerKey/models`); a service that cannot be asked is `ok: false` with its own words. */
export interface AiModelsDto {
  ok: boolean;
  models: string[];
  message: string | null;
}

/** What the sign-in page needs to show the bot check: the public site key, or nothing when no provider is active. */
export interface CaptchaConfigDto {
  provider: 'turnstile' | null;
  siteKey: string | null;
}
