import { Injectable } from '@nestjs/common';
import { CorePermission, type CreateNoticeInput, type NoticeActionInput, type UpdateNoticeInput } from '@arweqah-platform/shared';
import { TransactionRunner, type TransactionContext } from '../../../../common/application/transaction-runner';
import { Clock } from '../../../../common/application/clock';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { AccessContextService } from '../../../../core/access/application/access-context.service';
import { PermissionHoldersService } from '../../../../core/access/application/permission-holders.service';
import { NoticeDirectory } from '../../domain/contracts/notice-directory.port';
import { NoticeRepository } from '../../domain/contracts/notice.repository';
import { NoticeChannelNotFoundError, NoticeStateError } from '../../domain/errors/notice.errors';
import { canHappen, nextStatus } from '../../domain/rules/notice-machine';
import type { NoticeRecord } from '../../domain/types/notice.types';
import { NOTICE_AUDIT } from '../messages/notice.messages';
import { NoticeAccessPolicy } from '../policies/notice-access.policy';
import { NoticeAudienceService } from './notice-audience.service';
import { NoticeAuditor } from './notice-auditor.service';
import { NoticeContentService } from './notice-content.service';
import { NoticeNotifier } from './notice-notifier.service';
import { NoticeWorkflow } from './notice-workflow.service';

/** Writing a notice: creating it, changing a draft (or a rejected notice, or a new version), deleting a draft and sending it for approval. */
@Injectable()
export class NoticeService {
  constructor(
    private readonly notices: NoticeRepository,
    private readonly policy: NoticeAccessPolicy,
    private readonly content: NoticeContentService,
    private readonly audience: NoticeAudienceService,
    private readonly directory: NoticeDirectory,
    private readonly workflow: NoticeWorkflow,
    private readonly notifier: NoticeNotifier,
    private readonly auditor: NoticeAuditor,
    private readonly runner: TransactionRunner,
    private readonly holders: PermissionHoldersService,
    private readonly contexts: AccessContextService,
    private readonly clock: Clock,
  ) {}

  async create(ctx: AccessContext, input: CreateNoticeInput): Promise<string> {
    const channel = await this.notices.channelByCode(input.channelCode);
    if (!channel) throw new NoticeChannelNotFoundError();
    await this.policy.assertWriter(ctx, channel.id);
    const publishOn = this.content.assertPublishDate(input.publishOn);
    const rules = await this.audience.validate(input.audience);
    await this.content.assertFiles(ctx.userId, input.fileIds);
    const place = await this.directory.placeOf(ctx.userId);
    const id = await this.runner.run(async (tx) => {
      const notice = await this.notices.insert({ channelId: channel.id, kind: input.kind, authorId: ctx.userId, authorUnitId: place?.orgNodeId ?? null, publishOn }, tx);
      await this.content.writeVersion({ noticeId: notice.id, version: 1 }, input, rules, tx);
      await this.workflow.start(notice.id, ctx.userId, tx);
      return notice.id;
    });
    this.auditor.record(ctx.userId, NOTICE_AUDIT.created, { id }, { channel: input.channelCode, kind: input.kind });
    return id;
  }

  /** Changes the content of the version being written. A published notice keeps its channel and has no publish date: the new version is published as soon as it is approved. */
  async update(ctx: AccessContext, id: string, input: UpdateNoticeInput): Promise<string> {
    const notice = await this.policy.loadOwn(ctx, CorePermission.NoticesEdit, id);
    const hasPublished = notice.publishedAt !== null;
    const to = nextStatus(notice.status, { type: 'EDIT', hasPublished });
    if (to === null || to === 'discarded') throw new NoticeStateError('NOTICE_NOT_EDITABLE', notice.status);
    this.content.assertRevision(notice, input.revision);
    const channelId = await this.channelFor(ctx, notice, input.channelCode);
    const publishOn = hasPublished ? null : this.content.assertPublishDate(input.publishOn ?? notice.publishOn);
    const rules = await this.audience.validate(input.audience);
    await this.content.assertFiles(ctx.userId, input.fileIds);
    await this.runner.run(async (tx) => {
      await this.content.writeVersion({ noticeId: id, version: this.content.workingVersion(notice) }, input, rules, tx);
      this.content.assertPatched(await this.notices.patch(id, notice.revision, { status: to, channelId, kind: hasPublished ? notice.kind : input.kind, publishOn }, tx));
      await this.workflow.send(id, { type: 'EDIT', hasPublished }, { actorId: ctx.userId, tx });
    });
    this.auditor.record(ctx.userId, NOTICE_AUDIT.updated, { id }, { version: this.content.workingVersion(notice) });
    return id;
  }

  /** A new version keeps the channel it was published in; a notice not published yet may move to another channel the person writes in. */
  private async channelFor(ctx: AccessContext, notice: NoticeRecord, code: UpdateNoticeInput['channelCode']): Promise<string> {
    const channel = await this.notices.channelByCode(code);
    if (!channel) throw new NoticeChannelNotFoundError();
    if (channel.id === notice.channelId) return channel.id;
    if (notice.publishedAt !== null) throw new NoticeStateError('NOTICE_NOT_EDITABLE', notice.status);
    await this.policy.assertWriter(ctx, channel.id);
    return channel.id;
  }

  async remove(ctx: AccessContext, id: string): Promise<void> {
    const notice = await this.policy.loadOwn(ctx, CorePermission.NoticesDelete, id);
    if (!canHappen(notice.status, { type: 'DELETE' })) throw new NoticeStateError('NOTICE_NOT_DRAFT', notice.status);
    await this.runner.run(async (tx) => {
      await this.workflow.send(id, { type: 'DELETE' }, { actorId: ctx.userId, tx });
      await this.notices.remove(id, tx);
    });
    this.auditor.record(ctx.userId, NOTICE_AUDIT.deleted, { id });
  }

  /** Sends the version being written to the head of the writer's unit (the closest head above when the writer leads the unit; a platform administrator when there is none). */
  async submit(ctx: AccessContext, id: string, input: NoticeActionInput): Promise<string> {
    const notice = await this.policy.loadOwn(ctx, CorePermission.NoticesSubmit, id);
    const hasPublished = notice.publishedAt !== null;
    if (!canHappen(notice.status, { type: 'SUBMIT' })) throw new NoticeStateError('NOTICE_NOT_DRAFT', notice.status);
    this.content.assertRevision(notice, input.revision);
    if (!hasPublished) this.content.assertPublishDate(notice.publishOn);
    await this.audience.assertReaches(await this.notices.audienceOf(id, this.content.workingVersion(notice)));
    const approverId = await this.directory.approverFor(ctx.userId, notice.authorUnitId);
    await this.runner.run(async (tx) => {
      const patch = { status: 'pending_approval', approverUserId: approverId, submittedAt: this.clock.now(), rejectReason: null } as const;
      this.content.assertPatched(await this.notices.patch(id, notice.revision, patch, tx));
      await this.workflow.send(id, { type: 'SUBMIT' }, { actorId: ctx.userId, tx });
      await this.announce(ctx, notice, approverId, tx);
    });
    this.auditor.record(ctx.userId, NOTICE_AUDIT.submitted, { id }, { approverId, version: this.content.workingVersion(notice) });
    return id;
  }

  /** Tells the approver (or, without one, the platform administrators who hold the approval key at every unit). */
  private async announce(ctx: AccessContext, notice: NoticeRecord, approverId: string | null, tx: TransactionContext): Promise<void> {
    const channel = await this.notices.channelById(notice.channelId);
    const versions = await this.notices.versions(notice.id, tx);
    const shown = versions.find((v) => v.version === this.content.workingVersion(notice));
    if (!channel || !shown) return;
    const recipients = approverId ? [approverId] : await this.administrators();
    await this.notifier.send({ kind: 'submitted', recipients, notice: shown, channel, link: '/notices/approvals', email: true, authorName: await this.nameOf(ctx.userId), tx });
  }

  private async administrators(): Promise<string[]> {
    const holders = await this.holders.holdersOf(CorePermission.NoticesApprove);
    const contexts = await Promise.all(holders.map((id) => this.contexts.forUser(id)));
    return holders.filter((_, i) => contexts[i]?.scopeOf(CorePermission.NoticesApprove) === 'all');
  }

  private async nameOf(userId: string): Promise<string> {
    return (await this.directory.names([userId])).get(userId) ?? '';
  }
}
