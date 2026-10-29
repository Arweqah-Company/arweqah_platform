import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { TourDto } from '@arweqah-platform/shared';
import { Access } from '../../../../core/access/presentation/require-permission.decorator';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { TourService } from '../../application/services/tour.service';
import { TourParamDto } from '../dtos/tour.dtos';

/**
 * security: self-scoped. A person reads and changes only their own progress, so no permission key is needed (like /me/profile);
 * the administration tour answers 404 to anyone who may not use admin mode.
 */
@ApiTags('tour')
@Controller('me/tour')
export class MyTourController {
  constructor(private readonly tour: TourService) {}

  @Get(':tour')
  get(@Access() ctx: AccessContext, @Param() { tour }: TourParamDto): Promise<TourDto> {
    return this.tour.get(ctx, tour);
  }

  @Post(':tour/complete')
  @HttpCode(200)
  complete(@Access() ctx: AccessContext, @Param() { tour }: TourParamDto): Promise<TourDto> {
    return this.tour.finish(ctx, tour, 'completed');
  }

  @Post(':tour/skip')
  @HttpCode(200)
  skip(@Access() ctx: AccessContext, @Param() { tour }: TourParamDto): Promise<TourDto> {
    return this.tour.finish(ctx, tour, 'skipped');
  }

  @Post(':tour/restart')
  @HttpCode(200)
  restart(@Access() ctx: AccessContext, @Param() { tour }: TourParamDto): Promise<TourDto> {
    return this.tour.restart(ctx, tour);
  }
}
