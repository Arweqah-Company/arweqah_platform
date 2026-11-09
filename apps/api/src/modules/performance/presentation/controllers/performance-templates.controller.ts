/**
 * The evaluation file and the templates it gives (FR-118). Under `/api/performance/templates`.
 *
 *   GET    /        TemplatesDto    performance.cycle_view: the stage templates, the grade scale and the fiscal card kept
 *   POST   /file/ai EvalFileResult  performance.template_ai: the AI places the parts (`content`, problems, `ungrounded`); saves nothing; 422 AI_NOT_CONFIGURED, 422 EVAL_FILE_AI_RATE_LIMITED (6 an hour), 502 AI_UNAVAILABLE
 *   POST   /file/confirm EvalFileResult performance.template_upload: saves the reviewed `content` after the same checks; 422 TEMPLATE_NEEDS_REVIEW
 *   POST   /file    EvalFileResult  performance.template_upload: reads the file on the server (`dryRun` is the default); a file with a part that failed a check is 422 EVAL_FILE_NEEDS_REVIEW and nothing is saved
 *   PUT    /stages/:stage   TemplatesDto  performance.template_edit: adds or changes the template of a stage 1 to 5 (the basic total and the cap are computed; 422 TEMPLATE_NEEDS_REVIEW with the problem codes)
 *   DELETE /stages/:stage   204           performance.template_edit: removes it (404 when none is kept)
 *   PUT    /scale           TemplatesDto  performance.template_edit: the five bands of the grade scale (422 TEMPLATE_NEEDS_REVIEW)
 *   PUT    /fiscal-card     TemplatesDto  performance.template_edit: the twelve months and the notes of the fiscal-year card (422 TEMPLATE_NEEDS_REVIEW)
 */
import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission, type EvalFileResult, type TemplatesDto } from '@arweqah-platform/shared';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { PerformanceTemplateAiService } from '../../application/services/performance-template-ai.service';
import { PerformanceTemplateService } from '../../application/services/performance-template.service';
import { AnalyzeEvalFileDto, ConfirmEvalFileDto, EvalFileDto, FiscalCardBody, ScaleBody, StageParam, StageTemplateBody } from '../dtos/performance.dtos';

@ApiTags('performance')
@Controller('performance/templates')
export class PerformanceTemplatesController {
  constructor(
    private readonly templates: PerformanceTemplateService,
    private readonly aiFiles: PerformanceTemplateAiService,
  ) {}

  @Get()
  @RequirePermission(CorePermission.PerformanceCycleView)
  current(): Promise<TemplatesDto> {
    return this.templates.current();
  }

  @Post('file')
  @HttpCode(200)
  @RequirePermission(CorePermission.PerformanceTemplateUpload)
  file(@Access() ctx: AccessContext, @Body() body: EvalFileDto): Promise<EvalFileResult> {
    return this.templates.read(ctx, body);
  }

  @Post('file/ai')
  @HttpCode(200)
  @RequirePermission(CorePermission.PerformanceTemplateAi)
  analyzeFile(@Access() ctx: AccessContext, @Body() body: AnalyzeEvalFileDto): Promise<EvalFileResult> {
    return this.aiFiles.analyze(ctx, body);
  }

  @Post('file/confirm')
  @HttpCode(200)
  @RequirePermission(CorePermission.PerformanceTemplateUpload)
  confirmFile(@Access() ctx: AccessContext, @Body() body: ConfirmEvalFileDto): Promise<EvalFileResult> {
    return this.aiFiles.confirm(ctx, body);
  }

  @Put('stages/:stage')
  @RequirePermission(CorePermission.PerformanceTemplateEdit)
  saveStage(@Access() ctx: AccessContext, @Param() params: StageParam, @Body() body: StageTemplateBody): Promise<TemplatesDto> {
    return this.templates.saveStage(ctx, params.stage, body);
  }

  @Delete('stages/:stage')
  @HttpCode(204)
  @RequirePermission(CorePermission.PerformanceTemplateEdit)
  removeStage(@Access() ctx: AccessContext, @Param() params: StageParam): Promise<void> {
    return this.templates.removeStage(ctx, params.stage);
  }

  @Put('scale')
  @RequirePermission(CorePermission.PerformanceTemplateEdit)
  saveScale(@Access() ctx: AccessContext, @Body() body: ScaleBody): Promise<TemplatesDto> {
    return this.templates.saveScale(ctx, body);
  }

  @Put('fiscal-card')
  @RequirePermission(CorePermission.PerformanceTemplateEdit)
  saveFiscal(@Access() ctx: AccessContext, @Body() body: FiscalCardBody): Promise<TemplatesDto> {
    return this.templates.saveFiscal(ctx, body);
  }
}
