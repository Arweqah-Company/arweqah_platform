/** Request DTO classes: the zod schemas of packages/shared wrapped for Nest validation (one contract for the API and the web). */
import { createZodDto } from 'nestjs-zod';
import { addJobTitlesSchema, copyOrgLevelsSchema, createOrgNodeSchema, moveOrgNodeSchema, previewOrgLevelsSchema, saveOrgLevelsSchema, updateJobTitleSchema, updateOrgNodeSchema } from '@arweqah-platform/shared';

export class PreviewLevelsBody extends createZodDto(previewOrgLevelsSchema) {}
export class SaveLevelsBody extends createZodDto(saveOrgLevelsSchema) {}
export class CopyLevelsBody extends createZodDto(copyOrgLevelsSchema) {}
export class CreateNodeBody extends createZodDto(createOrgNodeSchema) {}
export class UpdateNodeBody extends createZodDto(updateOrgNodeSchema) {}
export class MoveNodeBody extends createZodDto(moveOrgNodeSchema) {}
export class AddTitlesBody extends createZodDto(addJobTitlesSchema) {}
export class UpdateTitleBody extends createZodDto(updateJobTitleSchema) {}
