import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { PersonRefDto, TicketDeskDto, TicketTypeDto } from '@arweqah-platform/shared';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, HiddenWithPage, RequireAdminMode } from '../../../../core/access/presentation/require-permission.decorator';
import { TicketSetupService } from '../../application/services/ticket-setup.service';
import { AssigneeSearchDto, DeskParam, DeskSettingsBody, TicketTypeBody, TypeParam } from '../dtos/tickets.dtos';

/**
 * security: self-scoped. These are the admin pages of the departments: they work only while platform admin mode is on
 * (@RequireAdminMode), and TicketSetupService then allows a desk manager their own departments and a platform manager all of them
 * (anything else answers "not found").
 */
@ApiTags('tickets')
@Controller('tickets/setup')
@RequireAdminMode()
@HiddenWithPage('ticket-setup')
export class TicketSetupController {
  constructor(private readonly setup: TicketSetupService) {}

  @Get('desks')
  desks(@Access() ctx: AccessContext): Promise<TicketDeskDto[]> {
    return this.setup.listDesks(ctx);
  }

  @Get('desks/:deskId')
  desk(@Access() ctx: AccessContext, @Param() { deskId }: DeskParam): Promise<TicketDeskDto> {
    return this.setup.getDesk(ctx, deskId);
  }

  @Put('desks/:deskId')
  save(@Access() ctx: AccessContext, @Param() { deskId }: DeskParam, @Body() body: DeskSettingsBody): Promise<TicketDeskDto> {
    return this.setup.saveDesk(ctx, deskId, body);
  }

  @Get('desks/:deskId/assignees')
  assignees(@Access() ctx: AccessContext, @Param() { deskId }: DeskParam, @Query() { q }: AssigneeSearchDto): Promise<PersonRefDto[]> {
    return this.setup.assignees(ctx, deskId, q);
  }

  @Post('desks/:deskId/types')
  createType(@Access() ctx: AccessContext, @Param() { deskId }: DeskParam, @Body() body: TicketTypeBody): Promise<TicketTypeDto> {
    return this.setup.createType(ctx, deskId, body);
  }

  @Put('desks/:deskId/types/:typeId')
  updateType(@Access() ctx: AccessContext, @Param() { deskId, typeId }: TypeParam, @Body() body: TicketTypeBody): Promise<TicketTypeDto> {
    return this.setup.updateType(ctx, deskId, typeId, body);
  }

  @Delete('desks/:deskId/types/:typeId')
  removeType(@Access() ctx: AccessContext, @Param() { deskId, typeId }: TypeParam): Promise<{ deleted: boolean }> {
    return this.setup.removeType(ctx, deskId, typeId);
  }
}
