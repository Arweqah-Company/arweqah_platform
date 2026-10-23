import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission, type PersonRefDto, type TicketDeskDto, type TicketTypeDto } from '@arweqah-platform/shared';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, HiddenWithPage, RequireAdminMode, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { TicketSetupService } from '../../application/services/ticket-setup.service';
import { AssigneeSearchDto, DeskParam, DeskSettingsBody, TicketTypeBody, TypeParam } from '../dtos/tickets.dtos';

/**
 * The admin pages of the departments: each route has its own key, and they work only while platform admin mode is on
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
  @RequirePermission(CorePermission.TicketsSetupView)
  desks(@Access() ctx: AccessContext): Promise<TicketDeskDto[]> {
    return this.setup.listDesks(ctx);
  }

  @Get('desks/:deskId')
  @RequirePermission(CorePermission.TicketsSetupView)
  desk(@Access() ctx: AccessContext, @Param() { deskId }: DeskParam): Promise<TicketDeskDto> {
    return this.setup.getDesk(ctx, deskId);
  }

  @Put('desks/:deskId')
  @RequirePermission(CorePermission.TicketsSetupEdit)
  save(@Access() ctx: AccessContext, @Param() { deskId }: DeskParam, @Body() body: DeskSettingsBody): Promise<TicketDeskDto> {
    return this.setup.saveDesk(ctx, deskId, body);
  }

  @Get('desks/:deskId/assignees')
  @RequirePermission(CorePermission.TicketsSetupView)
  assignees(@Access() ctx: AccessContext, @Param() { deskId }: DeskParam, @Query() { q }: AssigneeSearchDto): Promise<PersonRefDto[]> {
    return this.setup.assignees(ctx, deskId, q);
  }

  @Post('desks/:deskId/types')
  @RequirePermission(CorePermission.TicketsTypeCreate)
  createType(@Access() ctx: AccessContext, @Param() { deskId }: DeskParam, @Body() body: TicketTypeBody): Promise<TicketTypeDto> {
    return this.setup.createType(ctx, deskId, body);
  }

  @Put('desks/:deskId/types/:typeId')
  @RequirePermission(CorePermission.TicketsTypeUpdate)
  updateType(@Access() ctx: AccessContext, @Param() { deskId, typeId }: TypeParam, @Body() body: TicketTypeBody): Promise<TicketTypeDto> {
    return this.setup.updateType(ctx, deskId, typeId, body);
  }

  @Delete('desks/:deskId/types/:typeId')
  @RequirePermission(CorePermission.TicketsTypeDelete)
  removeType(@Access() ctx: AccessContext, @Param() { deskId, typeId }: TypeParam): Promise<{ deleted: boolean }> {
    return this.setup.removeType(ctx, deskId, typeId);
  }
}
