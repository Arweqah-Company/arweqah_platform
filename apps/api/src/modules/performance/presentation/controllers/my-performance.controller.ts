/**
 * The signed-in employee's own evaluation (FR-119). Under `/api/performance/me`.
 *
 *   GET    /notices      EvaluationNoticesDto  (own data): the open evaluation tasks of the person, each with its deadline and screen (plan §15.2)
 *   GET    /             MyEvaluationDto  performance.self_evaluate: where the cycle is and, when they have an evaluation, the template of their stage and what they wrote (never a score: scores come after the notification)
 *   PUT    /self         MyEvaluationDto  performance.self_evaluate: keeps the form (a draft until the first send; after it the form must stay complete, 422 SELF_EVALUATION_INVALID); 409 SELF_EVALUATION_CLOSED once its stage ended
 *   POST   /self/send    MyEvaluationDto  performance.self_evaluate: sends it (complete or 422); the first send tells the direct manager
 *   POST   /objection    MyResultDto  performance.object: the employee's one objection to an item of the notified result (409 OBJECTION_WINDOW_CLOSED / OBJECTION_EXISTS, 422 OBJECTION_ITEM_INVALID)
 *
 * `GET /` carries `result` only after the individual notification: the score is never in the answer before.
 */
import { Body, Controller, Get, HttpCode, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission, type EvaluationNoticesDto, type MyEvaluationDto, type MyResultDto } from '@arweqah-platform/shared';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, OwnData, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { PerformanceNoticeService } from '../../application/services/performance-notice.service';
import { PerformanceSelfService } from '../../application/services/performance-self.service';
import { PerformanceObjectionService } from '../../application/services/performance-objection.service';
import { RaiseObjectionDto, SaveSelfEvaluationDto } from '../dtos/performance.dtos';

@ApiTags('performance')
@Controller('performance/me')
export class MyPerformanceController {
  constructor(
    private readonly self: PerformanceSelfService,
    private readonly notices: PerformanceNoticeService,
    private readonly objections: PerformanceObjectionService,
  ) {}

  /** The bar «the cycle is open»: the evaluation tasks asked of the signed-in person now, each with its deadline and the screen to work from. */
  @Get('notices')
  @OwnData()
  noticesOfMine(@Access() ctx: AccessContext): Promise<EvaluationNoticesDto> {
    return this.notices.mine(ctx);
  }

  @Get()
  @RequirePermission(CorePermission.PerformanceSelfEvaluate)
  mine(@Access() ctx: AccessContext): Promise<MyEvaluationDto> {
    return this.self.mine(ctx);
  }

  @Put('self')
  @RequirePermission(CorePermission.PerformanceSelfEvaluate)
  save(@Access() ctx: AccessContext, @Body() body: SaveSelfEvaluationDto): Promise<MyEvaluationDto> {
    return this.self.save(ctx, body);
  }

  @Post('self/send')
  @HttpCode(200)
  @RequirePermission(CorePermission.PerformanceSelfEvaluate)
  send(@Access() ctx: AccessContext, @Body() body: SaveSelfEvaluationDto): Promise<MyEvaluationDto> {
    return this.self.send(ctx, body);
  }

  @Post('objection')
  @HttpCode(200)
  @RequirePermission(CorePermission.PerformanceObject)
  object(@Access() ctx: AccessContext, @Body() body: RaiseObjectionDto): Promise<MyResultDto | null> {
    return this.objections.raise(ctx, body);
  }
}
