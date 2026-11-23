import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission, type NoticeChannelDto, type NoticeChannelsDto, type NoticeSettingsDto, type NoticeUnitRefDto, type NoticeWriterCandidateDto } from '@arweqah-platform/shared';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, HiddenWithPage, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { NoticeChannelAdminService } from '../../application/services/notice-channel-admin.service';
import { NoticeChannelService } from '../../application/services/notice-channel.service';
import { AddNoticeWriterBody, ChannelCodeParam, CreateNoticeChannelBody, NoticeCandidatesQueryDto, NoticeChannelUnitsQueryDto, RenameNoticeChannelBody, NoticeSettingsBody, NoticeWritersQueryDto, WriterParam } from '../dtos/notices.dtos';

/**
 * The publishing channels page. The page needs `notices.channels_view`; making and renaming a channel needs `notices.channel_add`, disabling, enabling and deleting
 * `notices.channel_remove`, adding and removing a writer `notices.writer_add` / `notices.writer_remove` (checked in the services against the channel's unit: a channel
 * out of the reach of the key is «not found»); the batch settings need `notices.settings_edit`.
 */
@ApiTags('notices')
@Controller('notices/channels')
@HiddenWithPage('notices-channels')
export class NoticeChannelsController {
  constructor(
    private readonly channels: NoticeChannelService,
    private readonly admin: NoticeChannelAdminService,
  ) {}

  @Get()
  @RequirePermission(CorePermission.NoticesChannelsView)
  list(@Access() ctx: AccessContext, @Query() query: NoticeWritersQueryDto): Promise<NoticeChannelsDto> {
    return this.channels.list(ctx, query);
  }

  @Put('settings')
  @RequirePermission(CorePermission.NoticesSettingsEdit)
  saveSettings(@Access() ctx: AccessContext, @Body() body: NoticeSettingsBody): Promise<NoticeSettingsDto> {
    return this.channels.saveSettings(ctx, body);
  }

  @Get('units')
  @RequirePermission(CorePermission.NoticesChannelAdd)
  units(@Access() ctx: AccessContext, @Query() query: NoticeChannelUnitsQueryDto): Promise<NoticeUnitRefDto[]> {
    return this.admin.units(ctx, query);
  }

  @Post()
  @RequirePermission(CorePermission.NoticesChannelAdd)
  async create(@Access() ctx: AccessContext, @Body() body: CreateNoticeChannelBody): Promise<NoticeChannelDto> {
    return this.channels.one(ctx, await this.admin.create(ctx, body));
  }

  @Put(':code')
  @RequirePermission(CorePermission.NoticesChannelAdd)
  async rename(@Access() ctx: AccessContext, @Param() { code }: ChannelCodeParam, @Body() body: RenameNoticeChannelBody): Promise<NoticeChannelDto> {
    await this.admin.rename(ctx, code, body);
    return this.channels.one(ctx, code);
  }

  @Post(':code/disable')
  @HttpCode(200)
  @RequirePermission(CorePermission.NoticesChannelRemove)
  async disable(@Access() ctx: AccessContext, @Param() { code }: ChannelCodeParam): Promise<NoticeChannelDto> {
    await this.admin.disable(ctx, code);
    return this.channels.one(ctx, code);
  }

  @Post(':code/enable')
  @HttpCode(200)
  @RequirePermission(CorePermission.NoticesChannelRemove)
  async enable(@Access() ctx: AccessContext, @Param() { code }: ChannelCodeParam): Promise<NoticeChannelDto> {
    await this.admin.enable(ctx, code);
    return this.channels.one(ctx, code);
  }

  @Delete(':code')
  @HttpCode(204)
  @RequirePermission(CorePermission.NoticesChannelRemove)
  async remove(@Access() ctx: AccessContext, @Param() { code }: ChannelCodeParam): Promise<void> {
    await this.admin.remove(ctx, code);
  }

  @Get(':code/candidates')
  @RequirePermission(CorePermission.NoticesChannelsView)
  candidates(@Access() ctx: AccessContext, @Param() { code }: ChannelCodeParam, @Query() { search }: NoticeCandidatesQueryDto): Promise<NoticeWriterCandidateDto[]> {
    return this.channels.candidates(ctx, code, search);
  }

  @Post(':code/writers')
  @RequirePermission(CorePermission.NoticesChannelsView)
  async addWriter(@Access() ctx: AccessContext, @Param() { code }: ChannelCodeParam, @Body() body: AddNoticeWriterBody): Promise<NoticeChannelsDto> {
    await this.channels.addWriter(ctx, code, body);
    return this.channels.list(ctx, {});
  }

  @Delete(':code/writers/:userId')
  @HttpCode(204)
  @RequirePermission(CorePermission.NoticesChannelsView)
  async removeWriter(@Access() ctx: AccessContext, @Param() { code, userId }: WriterParam): Promise<void> {
    await this.channels.removeWriter(ctx, code, userId);
  }
}
