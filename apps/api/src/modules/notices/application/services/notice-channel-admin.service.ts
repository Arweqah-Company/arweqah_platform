import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CorePermission, type CreateNoticeChannelInput, type NoticeChannelCode, type NoticeChannelUnitsQuery, type RenameNoticeChannelInput, type NoticeUnitRefDto } from '@arweqah-platform/shared';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { ForbiddenError, NotFoundError } from '../../../../common/domain/domain-error';
import { ACCESS_CHANGED } from '../../../../core/access/application/access.events';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { NoticeChannelRepository } from '../../domain/contracts/notice-channel.repository';
import { NoticeChannelHasNoticesError, NoticeChannelNameExistsError } from '../../domain/errors/notice.errors';
import { channelCodeFrom, writerRoleNames } from '../../domain/rules/notice-channels.rules';
import { peopleScopeOf } from '../../domain/rules/notice-scope.rules';
import { NOTICE_AUDIT } from '../messages/notice.messages';
import { NoticeAuditor } from './notice-auditor.service';
import { NoticeChannelService } from './notice-channel.service';

/**
 * Making, renaming, disabling and deleting the channels of units (FR-177). Making a channel makes its writer role (fixed keys) with it; disabling takes the role from every
 * writer (their membership stays) and enabling gives it back; a channel that never had a notice can be deleted with its role. Every key is checked against the channel's unit.
 */
@Injectable()
export class NoticeChannelAdminService {
  constructor(
    private readonly channels: NoticeChannelRepository,
    private readonly service: NoticeChannelService,
    private readonly auditor: NoticeAuditor,
    private readonly runner: TransactionRunner,
    private readonly events: EventEmitter2,
  ) {}

  /** The units the person may make a channel for: inside the reach of `notices.channel_add`. */
  async units(ctx: AccessContext, query: NoticeChannelUnitsQuery): Promise<NoticeUnitRefDto[]> {
    const filter = ctx.filterFor(CorePermission.NoticesChannelAdd);
    if (!filter) throw new ForbiddenError();
    return (await this.channels.units(peopleScopeOf(filter), query.search?.trim() || undefined)).map((u) => ({ id: u.id, nameAr: u.nameAr, nameEn: u.nameEn }));
  }

  async create(ctx: AccessContext, input: CreateNoticeChannelInput): Promise<NoticeChannelCode> {
    const key = CorePermission.NoticesChannelAdd;
    if (!ctx.has(key)) throw new ForbiddenError();
    const unit = await this.channels.unit(input.unitId);
    if (!unit || !ctx.reaches(key, { orgNodeId: unit.id, companyId: unit.companyId })) throw new NotFoundError('Unit', input.unitId);
    if (await this.channels.nameTaken(input.nameAr, input.nameEn)) throw new NoticeChannelNameExistsError();
    const code = channelCodeFrom(input.nameEn, await this.channels.usedCodes());
    const channel = await this.runner.run((tx) => this.channels.createChannel({ code, nameAr: input.nameAr, nameEn: input.nameEn, unitId: unit.id, ...roleNames(input) }, tx));
    this.auditor.record(ctx.userId, NOTICE_AUDIT.channelCreated, { type: 'notice_channel', id: channel.id }, { code, unitId: unit.id });
    return code;
  }

  async rename(ctx: AccessContext, code: NoticeChannelCode, input: RenameNoticeChannelInput): Promise<void> {
    const channel = await this.service.rowFor(ctx, CorePermission.NoticesChannelAdd, code);
    if (await this.channels.nameTaken(input.nameAr, input.nameEn, channel.id)) throw new NoticeChannelNameExistsError();
    await this.runner.run((tx) => this.channels.renameChannel(channel.id, { nameAr: input.nameAr, nameEn: input.nameEn, ...roleNames(input) }, tx));
    this.auditor.record(ctx.userId, NOTICE_AUDIT.channelRenamed, { type: 'notice_channel', id: channel.id }, { code });
  }

  /** Disabled: nobody writes in it and its writers lose the role (their membership stays, so enabling it gives the role back). Doing it twice changes nothing. */
  async disable(ctx: AccessContext, code: NoticeChannelCode): Promise<void> {
    const channel = await this.service.rowFor(ctx, CorePermission.NoticesChannelRemove, code);
    if (!channel.isActive) return;
    const lost = await this.runner.run(async (tx) => {
      await this.channels.setActive(channel.id, false, tx);
      return this.channels.revokeRoleFromWriters(channel.id, channel.writerRoleId, tx);
    });
    this.changed(lost);
    this.auditor.record(ctx.userId, NOTICE_AUDIT.channelDisabled, { type: 'notice_channel', id: channel.id }, { code, writers: lost.length });
  }

  async enable(ctx: AccessContext, code: NoticeChannelCode): Promise<void> {
    const channel = await this.service.rowFor(ctx, CorePermission.NoticesChannelRemove, code);
    if (channel.isActive) return;
    const got = await this.runner.run(async (tx) => {
      await this.channels.setActive(channel.id, true, tx);
      return this.channels.grantRoleToWriters(channel.id, channel.writerRoleId, ctx.userId, tx);
    });
    this.changed(got);
    this.auditor.record(ctx.userId, NOTICE_AUDIT.channelEnabled, { type: 'notice_channel', id: channel.id }, { code, writers: got.length });
  }

  /** Only a channel that never had a notice; otherwise 409 and the screen offers to disable it. The role goes with the channel. */
  async remove(ctx: AccessContext, code: NoticeChannelCode): Promise<void> {
    const row = await this.service.rowFor(ctx, CorePermission.NoticesChannelRemove, code);
    if (await this.channels.hasNotices(row.id)) throw new NoticeChannelHasNoticesError();
    const lost = await this.runner.run((tx) => this.channels.deleteChannel(row, tx));
    this.changed(lost);
    this.auditor.record(ctx.userId, NOTICE_AUDIT.channelDeleted, { type: 'notice_channel', id: row.id }, { code, writers: lost.length });
  }

  private changed(userIds: string[]): void {
    for (const userId of userIds) this.events.emit(ACCESS_CHANGED, { userId });
  }
}

const roleNames = (names: { nameAr: string; nameEn: string }) => {
  const role = writerRoleNames(names);
  return { roleNameAr: role.nameAr, roleNameEn: role.nameEn };
};
