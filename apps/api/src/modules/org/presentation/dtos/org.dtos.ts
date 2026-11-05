/** Request DTO classes: the zod schemas of packages/shared wrapped for Nest validation (one contract for the API and the web). */
import { createZodDto } from 'nestjs-zod';
import {
  changeManagementModeSchema,
  createJobTitlesSchema,
  createOrgNodeSchema,
  endLeaderSchema,
  importJobTitlesSchema,
  jobTitleContentSchema,
  jobTitlesQuerySchema,
  leaderParamSchema,
  moveOrgNodeSchema,
  orgTreeQuerySchema,
  saveOrgLevelRulesSchema,
  saveOrgLevelsSchema,
  setLeaderSchema,
  setOrgNodeCodeSchema,
  titleCardQuerySchema,
  updateCharterSchema,
  updateJobTitleSchema,
  updateOrgNodeSchema,
} from '@arweqah-platform/shared';

export class OrgTreeQueryDto extends createZodDto(orgTreeQuerySchema) {}
export class SaveLevelsBody extends createZodDto(saveOrgLevelsSchema) {}
export class SaveLevelRulesBody extends createZodDto(saveOrgLevelRulesSchema) {}
export class CreateNodeBody extends createZodDto(createOrgNodeSchema) {}
export class UpdateNodeBody extends createZodDto(updateOrgNodeSchema) {}
export class MoveNodeBody extends createZodDto(moveOrgNodeSchema) {}
export class SetNodeCodeBody extends createZodDto(setOrgNodeCodeSchema) {}
export class ChangeModeBody extends createZodDto(changeManagementModeSchema) {}
export class AddTitlesBody extends createZodDto(createJobTitlesSchema) {}
export class UpdateTitleBody extends createZodDto(updateJobTitleSchema) {}
export class UpdateCharterBody extends createZodDto(updateCharterSchema) {}
export class SetLeaderBody extends createZodDto(setLeaderSchema) {}
export class EndLeaderBody extends createZodDto(endLeaderSchema) {}
export class LeaderParam extends createZodDto(leaderParamSchema) {}
export class UpdateTitleContentBody extends createZodDto(jobTitleContentSchema) {}
export class JobTitlesQueryDto extends createZodDto(jobTitlesQuerySchema) {}
export class TitleCardQueryDto extends createZodDto(titleCardQuerySchema) {}
export class ImportTitlesBody extends createZodDto(importJobTitlesSchema) {}
