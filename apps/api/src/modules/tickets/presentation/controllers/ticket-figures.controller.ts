import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission, type TicketFiguresDto } from '@arweqah-platform/shared';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, HiddenWithPage, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { TicketFiguresService } from '../../application/services/ticket-figures.service';
import { FiguresQueryDto } from '../dtos/tickets.dtos';

/** Needs the figures key (no admin mode); the service limits the figures to the caller's departments (all for a platform manager). */
@ApiTags('tickets')
@Controller('tickets/figures')
@HiddenWithPage('ticket-figures')
export class TicketFiguresController {
  constructor(private readonly figures: TicketFiguresService) {}

  @Get()
  @RequirePermission(CorePermission.TicketsFiguresView)
  figuresOf(@Access() ctx: AccessContext, @Query() { deskId }: FiguresQueryDto): Promise<TicketFiguresDto> {
    return this.figures.figuresFor(ctx, deskId);
  }
}
