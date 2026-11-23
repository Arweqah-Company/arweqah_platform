import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission, type NoticeDetailsDto, type NoticeListItemDto, type Paginated } from '@arweqah-platform/shared';
import { IdParam } from '../../../../common/presentation/zod-query';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, HiddenWithPage, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { NoticeApprovalService } from '../../application/services/notice-approval.service';
import { NoticeQueryService } from '../../application/services/notice-query.service';
import { NoticeActionBody, NoticeApprovalsQueryDto, RejectNoticeBody } from '../dtos/notices.dtos';

/** The head's page: the notices of their unit and below that wait for a decision, and the two decisions. */
@ApiTags('notices')
@Controller('notices')
@HiddenWithPage('notices-approvals')
export class NoticeApprovalsController {
  constructor(
    private readonly approvals: NoticeApprovalService,
    private readonly queries: NoticeQueryService,
  ) {}

  @Get('approvals')
  @RequirePermission(CorePermission.NoticesApproveView)
  list(@Access() ctx: AccessContext, @Query() query: NoticeApprovalsQueryDto): Promise<Paginated<NoticeListItemDto>> {
    return this.queries.approvals(ctx, query);
  }

  @Post(':id/approve')
  @HttpCode(200)
  @RequirePermission(CorePermission.NoticesApprove)
  async approve(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: NoticeActionBody): Promise<NoticeDetailsDto> {
    await this.approvals.approve(ctx, id, body);
    return this.queries.details(ctx, id);
  }

  @Post(':id/reject')
  @HttpCode(200)
  @RequirePermission(CorePermission.NoticesReject)
  async reject(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: RejectNoticeBody): Promise<NoticeDetailsDto> {
    await this.approvals.reject(ctx, id, body);
    return this.queries.details(ctx, id);
  }
}
