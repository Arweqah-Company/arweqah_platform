import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CYCLE_DATE_KEYS, analyzeEvalFileSchema, confirmEvalFileSchema, catalogItemSchema, evalFileSchema, fiscalInputSchema, openCycleSchema, reminderSchema, saveSelfEvaluationSchema, scaleInputSchema, setCycleDateSchema, stageTemplateInputSchema } from '@arweqah-platform/shared';

export class EvalFileDto extends createZodDto(evalFileSchema) {}
export class OpenCycleDto extends createZodDto(openCycleSchema) {}
export class SetCycleDateDto extends createZodDto(setCycleDateSchema) {}
export class ReminderBody extends createZodDto(reminderSchema) {}
export class StageTemplateBody extends createZodDto(stageTemplateInputSchema) {}
export class ScaleBody extends createZodDto(scaleInputSchema) {}
export class FiscalCardBody extends createZodDto(fiscalInputSchema) {}
export class StageParam extends createZodDto(z.strictObject({ stage: z.coerce.number().int().min(1).max(5) })) {}
export class CatalogItemDto extends createZodDto(catalogItemSchema) {}
export class CycleDateKeyParam extends createZodDto(z.strictObject({ key: z.enum(CYCLE_DATE_KEYS) })) {}
export class SaveSelfEvaluationDto extends createZodDto(saveSelfEvaluationSchema) {}
export class AnalyzeEvalFileDto extends createZodDto(analyzeEvalFileSchema) {}
export class ConfirmEvalFileDto extends createZodDto(confirmEvalFileSchema) {}
