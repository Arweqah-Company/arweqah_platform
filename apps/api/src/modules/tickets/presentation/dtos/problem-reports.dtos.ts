import { createZodDto } from 'nestjs-zod';
import { createProblemReportSchema, problemReportSettingsSchema } from '@arweqah-platform/shared';

export class CreateProblemReportBody extends createZodDto(createProblemReportSchema) {}
export class ProblemReportSettingsBody extends createZodDto(problemReportSettingsSchema) {}
