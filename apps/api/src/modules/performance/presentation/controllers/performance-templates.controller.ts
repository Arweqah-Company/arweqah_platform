/**
 * The evaluation file and the templates it gives (FR-118). Under `/api/performance/templates`.
 *
 *   GET    /        TemplatesDto    performance.cycle_view: the stage templates, the grade scale and the fiscal card kept
 *   POST   /file    EvalFileResult  performance.template_upload: reads the file on the server (`dryRun` is the default); a file with a part that failed a check is 422 EVAL_FILE_NEEDS_REVIEW and nothing is saved
 */
import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission, type EvalFileResult, type TemplatesDto } from '@arweqah-platform/shared';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { PerformanceTemplateService } from '../../application/services/performance-template.service';
import { EvalFileDto } from '../dtos/performance.dtos';

@ApiTags('performance')
@Controller('performance/templates')
export class PerformanceTemplatesController {
  constructor(private readonly templates: PerformanceTemplateService) {}

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
}
