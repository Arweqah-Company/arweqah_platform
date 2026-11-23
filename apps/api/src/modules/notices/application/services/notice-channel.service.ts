import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CorePermission,
  type AddNoticeWriterInput,
  type NoticeChannelCode,
  type NoticeChannelDto,
  type NoticeChannelsDto,
  type NoticeSettingsDto,
  type NoticeSettingsInput,
  type NoticeWriterCandidateDto,
  type NoticeWritersQuery,
} from '@arweqah-platform/shared';
import { TransactionRunner, type TransactionContext } from '../../../../common/application/transaction-runner';
import { ForbiddenError, NotFoundError } from '../../../../common/domain/domain-error';
import { ACCESS_CHANGED } from '../../../../core/access/application/access.events';
import { UserAccessService } from '../../../../core/access/application/user-access.service';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { NoticeChannelRepository } from '../../domain/contracts/notice-channel.repository';
import { NoticeRepository } from '../../domain/contracts/notice.repository';
import { NoticeChannelDisabledError, NoticeChannelNotFoundError, NoticeWriterExistsError, NoticeWriterInactiveError, NoticeWriterNoAccountError } from '../../domain/errors/notice.errors';
import { channelAbilities, MANAGER_KEYS } from '../../domain/rules/notice-channels.rules';
import { peopleScopeOf } from '../../domain/rules/notice-scope.rules';
import type { ChannelRow } from '../../domain/types/notice.types';
import { NOTICE_AUDIT } from '../messages/notice.messages';
import { NoticeTransformer } from '../transformers/notice.transformer';
import { NoticeAuditor } from './notice-auditor.service';
import { NoticeNotifier } from './notice-notifier.service';

const ALL_PEOPLE = { kind: 'all' } as const;

/** Does the person's key reach the channel? A channel is checked against its own unit (a channel of no unit only by the scope `all`). */
export const reachesChannel = (ctx: AccessContext, key: string, channel: Pick<ChannelRow, 'unitId' | 'unitCompanyId'>): boolean =>
  ctx.reaches(key, { orgNodeId: channel.unitId, companyId: channel.unitCompanyId });

/**
 * The publishing channels page: the channels of the units and who writes in each. Adding a writer gives them the channel's role in the same transaction, removing takes it
 * back (decision N7). The keys are checked against the channel's unit, never against the writer's own place (FR-177).
 */
@Injectable()
export class NoticeChannelService {
  constructor(
    private readonly notices: NoticeRepository,
    private readonly channels: NoticeChannelRepository,
    private readonly access: UserAccessService,
    private readonly notifier: NoticeNotifier,
    private readonly transformer: NoticeTransformer,
    private readonly auditor: NoticeAuditor,
    private readonly runner: TransactionRunner,
    private readonly events: EventEmitter2,
  ) {}

  /** Makes the first two channels, their writer roles and keys when missing (the migration does it for a real database; the seed and the tests call this). */
  ensureSetup(): Promise<void> {
    return this.channels.ensureSetup();
  }

  /** The channel's row by its code; «not found» when there is none. */
  async rowOf(code: NoticeChannelCode): Promise<ChannelRow> {
    const row = (await this.channels.channelRows(code))[0];
    if (!row) throw new NoticeChannelNotFoundError();
    return row;
  }

  /** The channel only when the key reaches its unit (otherwise «not found», so a person does not learn that it exists). */
  async rowFor(ctx: AccessContext, key: string, code: NoticeChannelCode): Promise<ChannelRow> {
    if (!ctx.has(key)) throw new ForbiddenError();
    const row = await this.rowOf(code);
    if (!reachesChannel(ctx, key, row)) throw new NoticeChannelNotFoundError();
    return row;
  }

  async list(ctx: AccessContext, query: NoticeWritersQuery): Promise<NoticeChannelsDto> {
    const cards: NoticeChannelDto[] = [];
    for (const row of await this.channels.channelRows()) {
      const card = await this.card(ctx, row, query);
      if (card) cards.push(card);
    }
    return { channels: cards, canCreate: ctx.has(CorePermission.NoticesChannelAdd), settings: ctx.has(CorePermission.NoticesSettingsEdit) ? await this.settings(true) : null };
  }

  /** One channel as the person sees it (for the answer of a change). */
  async one(ctx: AccessContext, code: NoticeChannelCode): Promise<NoticeChannelDto> {
    const card = await this.card(ctx, await this.rowOf(code), {});
    if (!card) throw new NoticeChannelNotFoundError();
    return card;
  }

  /** A channel's card: only for a person whose keys reach its unit, with every writer. */
  private async card(ctx: AccessContext, row: ChannelRow, query: NoticeWritersQuery): Promise<NoticeChannelDto | null> {
    const reaches = (key: string) => reachesChannel(ctx, key, row) && ctx.has(key);
    if (!MANAGER_KEYS.some(reaches)) return null;
    const can = channelAbilities(row, reaches);
    const writers = (await this.channels.writers(row.id, ALL_PEOPLE, query)).map((w) => this.transformer.toWriter(w, can.canRemoveWriter));
    return this.transformer.toChannel(row, writers, can);
  }

  /** People who may be made writers: active employees inside the reach of the add key who are not writers in the channel (the name is searched from its first letter). */
  async candidates(ctx: AccessContext, code: NoticeChannelCode, search: string | undefined): Promise<NoticeWriterCandidateDto[]> {
    const channel = await this.rowFor(ctx, CorePermission.NoticesWriterAdd, code);
    if (!channel.isActive) throw new NoticeChannelDisabledError();
    const filter = ctx.filterFor(CorePermission.NoticesWriterAdd);
    if (!filter) throw new ForbiddenError();
    return (await this.channels.candidates(channel.id, peopleScopeOf(filter), search)).map((row) => this.transformer.toCandidate(row));
  }

  async addWriter(ctx: AccessContext, code: NoticeChannelCode, input: AddNoticeWriterInput): Promise<void> {
    const key = CorePermission.NoticesWriterAdd;
    const channel = await this.rowFor(ctx, key, code);
    if (!channel.isActive) throw new NoticeChannelDisabledError();
    const employee = await this.channels.employee(input.employeeId);
    if (!employee || !ctx.reaches(key, { orgNodeId: employee.orgNodeId, companyId: employee.companyId })) throw new NotFoundError('Employee', input.employeeId);
    if (!employee.userId) throw new NoticeWriterNoAccountError();
    if (!employee.isActive) throw new NoticeWriterInactiveError();
    const userId = employee.userId;
    await this.runner.run(async (tx) => {
      if (!(await this.channels.insertWriter(channel.id, userId, tx))) throw new NoticeWriterExistsError();
      await this.access.grantRole(userId, channel.writerRoleId, ctx.userId, tx);
      await this.notifier.send({ kind: 'writerAdded', recipients: [userId], channel, link: '/notices/manage', email: true, tx });
    });
    this.events.emit(ACCESS_CHANGED, { userId });
    this.auditor.record(ctx.userId, NOTICE_AUDIT.writerAdded, { type: 'notice_channel', id: channel.id }, { userId, note: input.note ?? null });
  }

  async removeWriter(ctx: AccessContext, code: NoticeChannelCode, userId: string): Promise<void> {
    const channel = await this.rowFor(ctx, CorePermission.NoticesWriterRemove, code);
    const writer = await this.channels.writerOf(channel.id, userId);
    if (!writer) throw new NotFoundError('Writer', userId);
    await this.runner.run((tx) => this.drop(channel, userId, tx));
    this.events.emit(ACCESS_CHANGED, { userId });
    this.auditor.record(ctx.userId, NOTICE_AUDIT.writerRemoved, { type: 'notice_channel', id: channel.id }, { userId, drafts: writer.drafts, pendingApproval: writer.pendingApproval });
  }

  /** The row and the role go together: one transaction, so nobody is left with a role and no row, or the other way round. Their drafts stay (decision Q12). */
  private async drop(channel: ChannelRow, userId: string, tx: TransactionContext): Promise<void> {
    await this.channels.removeWriter(channel.id, userId, tx);
    await this.access.revokeRole(userId, channel.writerRoleId, tx);
    await this.notifier.send({ kind: 'writerRemoved', recipients: [userId], channel, link: '/notices', email: true, tx });
  }

  async settings(canEdit: boolean): Promise<NoticeSettingsDto> {
    const s = await this.notices.settings();
    return { batchSize: s.batchSize, batchIntervalMinutes: s.batchIntervalMinutes, canEdit };
  }

  async saveSettings(ctx: AccessContext, input: NoticeSettingsInput): Promise<NoticeSettingsDto> {
    await this.notices.saveSettings(input.batchSize, input.batchIntervalMinutes, ctx.userId);
    this.auditor.record(ctx.userId, NOTICE_AUDIT.settingsUpdated, { type: 'notice_settings', id: 'notice-settings' }, { ...input });
    return this.settings(true);
  }
}
