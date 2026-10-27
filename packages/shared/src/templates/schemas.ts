import { z } from 'zod';

/**
 * Message templates: the wording of every e-mail and notification the platform sends, in Arabic and English. The code owns
 * which templates exist and which variables each one can fill; an administrator edits the wording and (for e-mail) the colors.
 * A variable is written `{{name}}` inside the text (the editor shows it as `@name`).
 */
export const TEMPLATE_KINDS = ['email', 'notification'] as const;
export type TemplateKind = (typeof TEMPLATE_KINDS)[number];

export const TEMPLATE_AREAS = ['sign_in', 'tickets', 'tasks', 'notifications'] as const;
export type TemplateArea = (typeof TEMPLATE_AREAS)[number];

/** The seven brand colors, the only colors a template may use. */
export const BRAND_COLORS = { cream: '#FFFCEE', green: '#85BA95', ink: '#0C2028', orange: '#C16426', beige: '#D7D2CB', petrol: '#00415B', yellow: '#FBD564' } as const;
export type BrandColor = keyof typeof BRAND_COLORS;
export const BRAND_COLOR_KEYS = Object.keys(BRAND_COLORS) as [BrandColor, ...BrandColor[]];

export const TEMPLATE_LANGS = ['ar', 'en'] as const;
export type TemplateLang = (typeof TEMPLATE_LANGS)[number];

export const VARIABLE_PATTERN = /\{\{([a-zA-Z][a-zA-Z0-9]*)\}\}/g;

const localizedSchema = z.strictObject({
  /** The subject of an e-mail, the title of a notification. */
  title: z.string().trim().min(1).max(200),
  /** The short line mail apps show beside the subject (e-mail only). */
  preheader: z.string().trim().max(200).default(''),
  /** The label of the button that opens the link (e-mail only). */
  buttonText: z.string().trim().max(60).default(''),
  /** E-mail: formatted text (HTML); notification: plain text with line breaks. */
  body: z.string().trim().min(1).max(20_000),
});

export const templateContentSchema = z.strictObject({
  ar: localizedSchema,
  en: localizedSchema,
  /** E-mail only: the header band and the button, from the brand palette. */
  colors: z.strictObject({ band: z.enum(BRAND_COLOR_KEYS), button: z.enum(BRAND_COLOR_KEYS) }).optional(),
});
export type TemplateContent = z.infer<typeof templateContentSchema>;
export type LocalizedTemplateContent = TemplateContent['ar'];

export const saveTemplateInputSchema = z.strictObject({ content: templateContentSchema });
export type SaveTemplateInput = z.infer<typeof saveTemplateInputSchema>;

export const previewTemplateInputSchema = z.strictObject({ content: templateContentSchema, lang: z.enum(TEMPLATE_LANGS) });
export type PreviewTemplateInput = z.infer<typeof previewTemplateInputSchema>;

export const rejectTemplateInputSchema = z.strictObject({ note: z.string().trim().max(500).default('') });
export type RejectTemplateInput = z.infer<typeof rejectTemplateInputSchema>;

export const templateSettingsInputSchema = z.strictObject({ requireApproval: z.boolean() });
export type TemplateSettingsInput = z.infer<typeof templateSettingsInputSchema>;

export const testTemplateInputSchema = z.strictObject({ content: templateContentSchema, lang: z.enum(TEMPLATE_LANGS) });
export type TestTemplateInput = z.infer<typeof testTemplateInputSchema>;

export interface TemplateVariableDto {
  name: string;
  descriptionAr: string;
  descriptionEn: string;
  exampleAr: string;
  exampleEn: string;
  /** The message cannot be saved without it (the activation link). */
  required: boolean;
}

export type TemplateStatus = 'default' | 'custom' | 'pending';

export interface TemplateDto {
  key: string;
  kind: TemplateKind;
  area: TemplateArea;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  variables: TemplateVariableDto[];
  status: TemplateStatus;
  /** The wording in the code, used while nothing is customised and after a reset. */
  defaults: TemplateContent;
  /** What is live now: the customised wording, or the default when none. */
  content: TemplateContent;
  pending: { content: TemplateContent; submittedById: string; submittedByName: string; submittedAt: string } | null;
  updatedAt: string | null;
}

export interface TemplateCatalogDto {
  kind: TemplateKind;
  requireApproval: boolean;
  templates: TemplateDto[];
}

export interface TemplatePreviewDto {
  title: string;
  /** E-mail: the whole page; notification: the body as a paragraph. */
  html: string;
  text: string;
}
