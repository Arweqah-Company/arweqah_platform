import { createZodDto } from 'nestjs-zod';
import { teamQuerySchema, setRequiredSchema, certificatesQuerySchema, rejectProofSchema, submitProofSchema, acknowledgeCareerSchema, importLearningLinksSchema, careerTitlesQuerySchema, extractTitleFileSchema, analyzeTitleFileSchema, reopenAcknowledgementSchema, saveCareerContentSchema, createRequestSchema, rejectRequestSchema, requestsQuerySchema, requestPreviewQuerySchema, recordCompetencySchema } from '@arweqah-platform/shared';

export class SaveCareerContentDto extends createZodDto(saveCareerContentSchema) {}
export class ExtractTitleFileDto extends createZodDto(extractTitleFileSchema) {}
export class AnalyzeTitleFileDto extends createZodDto(analyzeTitleFileSchema) {}
export class AcknowledgeCareerDto extends createZodDto(acknowledgeCareerSchema) {}
export class ReopenAcknowledgementDto extends createZodDto(reopenAcknowledgementSchema) {}
export class CareerTitlesQueryDto extends createZodDto(careerTitlesQuerySchema) {}
export class ImportLearningLinksDto extends createZodDto(importLearningLinksSchema) {}
export class SubmitProofDto extends createZodDto(submitProofSchema) {}
export class RejectProofDto extends createZodDto(rejectProofSchema) {}
export class CertificatesQueryDto extends createZodDto(certificatesQuerySchema) {}
export class SetRequiredDto extends createZodDto(setRequiredSchema) {}
export class TeamQueryDto extends createZodDto(teamQuerySchema) {}
export class CreateRequestDto extends createZodDto(createRequestSchema) {}
export class RejectRequestDto extends createZodDto(rejectRequestSchema) {}
export class RequestsQueryDto extends createZodDto(requestsQuerySchema) {}
export class RequestPreviewQueryDto extends createZodDto(requestPreviewQuerySchema) {}
export class RecordCompetencyDto extends createZodDto(recordCompetencySchema) {}
