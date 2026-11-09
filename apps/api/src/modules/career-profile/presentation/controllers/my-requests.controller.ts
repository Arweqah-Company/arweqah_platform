/**
 * The signed-in employee's development requests (FR-116). Under `/api/career-profile/me/requests`.
 *
 *   GET    /preview?cost&plan  RequestPreviewDto  career_requests.create: who would decide it and what is left of the yearly budget
 *   GET    /                   DevelopmentRequestDto[]  career_profile.view: their requests, newest first
 *   POST   /                   DevelopmentRequestDto    career_requests.create: sends a request (422 CAREER_REQUEST_NO_APPROVER when nobody holds a post that can decide it)
 */
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission, type DevelopmentRequestDto, type RequestPreviewDto } from '@arweqah-platform/shared';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { CareerRequestService } from '../../application/services/career-request.service';
import { CreateRequestDto, RequestPreviewQueryDto } from '../dtos/career-profile.dtos';

@ApiTags('career-profile')
@Controller('career-profile/me/requests')
export class MyRequestsController {
  constructor(private readonly requests: CareerRequestService) {}

  @Get('preview')
  @RequirePermission(CorePermission.CareerRequestsCreate)
  preview(@Access() ctx: AccessContext, @Query() query: RequestPreviewQueryDto): Promise<RequestPreviewDto> {
    return this.requests.preview(ctx, query);
  }

  @Get()
  @RequirePermission(CorePermission.CareerProfileView)
  mine(@Access() ctx: AccessContext): Promise<DevelopmentRequestDto[]> {
    return this.requests.mine(ctx);
  }

  @Post()
  @RequirePermission(CorePermission.CareerRequestsCreate)
  create(@Access() ctx: AccessContext, @Body() body: CreateRequestDto): Promise<DevelopmentRequestDto> {
    return this.requests.create(ctx, body);
  }
}
