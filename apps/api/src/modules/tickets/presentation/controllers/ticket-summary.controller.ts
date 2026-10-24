import { CorePermission } from '@arweqah-platform/shared';
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { TicketSummaryDto } from '@arweqah-platform/shared';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, HiddenWithPage, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { TicketSummaryService } from '../../application/services/ticket-summary.service';

/** The person's own tickets in numbers, for the home page. Always the caller's own: nothing here depends on an id from the client. */
@ApiTags('tickets')
@Controller('tickets/mine-summary')
@HiddenWithPage('tickets')
export class TicketSummaryController {
  constructor(private readonly summaries: TicketSummaryService) {}

  @Get()
  @RequirePermission(CorePermission.TicketsView)
  summary(@Access() ctx: AccessContext): Promise<TicketSummaryDto> {
    return this.summaries.summary(ctx.userId);
  }
}
