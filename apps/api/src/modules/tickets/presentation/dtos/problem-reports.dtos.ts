import { createZodDto } from 'nestjs-zod';
import { analyzeProblemReportSchema, createProblemReportSchema, problemReportSettingsSchema } from '@arweqah-platform/shared';

export class AnalyzeProblemReportBody extends createZodDto(analyzeProblemReportSchema) {}
export class CreateProblemReportBody extends createZodDto(createProblemReportSchema) {}
export class ProblemReportSettingsBody extends createZodDto(problemReportSettingsSchema) {}
