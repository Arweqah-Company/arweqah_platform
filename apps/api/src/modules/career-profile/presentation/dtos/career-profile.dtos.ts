import { createZodDto } from 'nestjs-zod';
import { acknowledgeCareerSchema, importLearningLinksSchema, careerTitlesQuerySchema, extractTitleFileSchema, reopenAcknowledgementSchema, saveCareerContentSchema } from '@arweqah-platform/shared';

export class SaveCareerContentDto extends createZodDto(saveCareerContentSchema) {}
export class ExtractTitleFileDto extends createZodDto(extractTitleFileSchema) {}
export class AcknowledgeCareerDto extends createZodDto(acknowledgeCareerSchema) {}
export class ReopenAcknowledgementDto extends createZodDto(reopenAcknowledgementSchema) {}
export class CareerTitlesQueryDto extends createZodDto(careerTitlesQuerySchema) {}
export class ImportLearningLinksDto extends createZodDto(importLearningLinksSchema) {}
