/**
 * The page «development requests» for the people who decide them (FR-116). Under `/api/career/requests`.
 *
 *   GET    /?search&status&level&plan&mine&page&pageSize  RequestsPageDto  career_requests.view: those with the viewer (`mine`), or of the people the view scope reaches
 *   GET    /:id/agreement                                 the agreement file  career_requests.view
 *   POST   /:id/approve                                   204  career_requests.approve: only the person it is with (403 otherwise; 409 when it was decided)
 *   POST   /:id/reject                                    204  career_requests.reject: with a reason of at least five characters
 */
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CorePermission, type RequestsPageDto } from '@arweqah-platform/shared';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { FilesService } from '../../../../core/files/application/files.service';
import { sendOpenedFile } from '../../../../core/files/presentation/send-file';
import { CareerRequestDecisionService } from '../../application/services/career-request-decision.service';
import { CareerRequestService } from '../../application/services/career-request.service';
import { RejectRequestDto, RequestsQueryDto } from '../dtos/career-profile.dtos';

@ApiTags('career-profile')
@Controller('career/requests')
export class CareerRequestsController {
  constructor(
    private readonly requests: CareerRequestService,
    private readonly decisions: CareerRequestDecisionService,
    private readonly files: FilesService,
  ) {}

  @Get()
  @RequirePermission(CorePermission.CareerRequestsView)
  list(@Access() ctx: AccessContext, @Query() query: RequestsQueryDto): Promise<RequestsPageDto> {
    return this.requests.list(ctx, query);
  }

  @Get(':id/agreement')
  @RequirePermission(CorePermission.CareerRequestsView)
  async agreement(@Access() ctx: AccessContext, @Param('id', ParseUUIDPipe) id: string, @Res() res: Response): Promise<void> {
    const file = await this.decisions.agreement(ctx, id);
    sendOpenedFile(res, file, await this.files.open(file));
  }

  @Post(':id/approve')
  @HttpCode(204)
  @RequirePermission(CorePermission.CareerRequestsApprove)
  approve(@Access() ctx: AccessContext, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.decisions.approve(ctx, id);
  }

  @Post(':id/reject')
  @HttpCode(204)
  @RequirePermission(CorePermission.CareerRequestsReject)
  reject(@Access() ctx: AccessContext, @Param('id', ParseUUIDPipe) id: string, @Body() body: RejectRequestDto): Promise<void> {
    return this.decisions.reject(ctx, id, body);
  }
}
