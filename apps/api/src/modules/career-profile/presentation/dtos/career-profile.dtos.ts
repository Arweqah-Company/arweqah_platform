import { createZodDto } from 'nestjs-zod';
import { teamQuerySchema, setRequiredSchema, certificatesQuerySchema, rejectProofSchema, submitProofSchema, acknowledgeCareerSchema, importLearningLinksSchema, careerTitlesQuerySchema, extractTitleFileSchema, reopenAcknowledgementSchema, saveCareerContentSchema } from '@arweqah-platform/shared';

export class SaveCareerContentDto extends createZodDto(saveCareerContentSchema) {}
export class ExtractTitleFileDto extends createZodDto(extractTitleFileSchema) {}
export class AcknowledgeCareerDto extends createZodDto(acknowledgeCareerSchema) {}
export class ReopenAcknowledgementDto extends createZodDto(reopenAcknowledgementSchema) {}
export class CareerTitlesQueryDto extends createZodDto(careerTitlesQuerySchema) {}
export class ImportLearningLinksDto extends createZodDto(importLearningLinksSchema) {}
export class SubmitProofDto extends createZodDto(submitProofSchema) {}
export class RejectProofDto extends createZodDto(rejectProofSchema) {}
export class CertificatesQueryDto extends createZodDto(certificatesQuerySchema) {}
export class SetRequiredDto extends createZodDto(setRequiredSchema) {}
export class TeamQueryDto extends createZodDto(teamQuerySchema) {}
