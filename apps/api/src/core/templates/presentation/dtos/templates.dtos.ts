import { createZodDto } from 'nestjs-zod';
import { previewTemplateInputSchema, rejectTemplateInputSchema, saveTemplateInputSchema, templateSettingsInputSchema } from '@arweqah-platform/shared';

export class SaveTemplateDto extends createZodDto(saveTemplateInputSchema) {}
export class PreviewTemplateDto extends createZodDto(previewTemplateInputSchema) {}
export class RejectTemplateDto extends createZodDto(rejectTemplateInputSchema) {}
export class TemplateSettingsDto extends createZodDto(templateSettingsInputSchema) {}
