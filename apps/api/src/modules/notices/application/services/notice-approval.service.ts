import { Injectable } from '@nestjs/common';
import { CorePermission, type NoticeActionInput, type RejectNoticeInput } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner, type TransactionContext } from '../../../../common/application/transaction-runner';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { JobScheduler } from '../../../../core/messaging/application/outbox';
import { NoticeDeliveryRepository } from '../../domain/contracts/notice-delivery.repository';
import { NoticeRepository } from '../../domain/contracts/notice.repository';
import { NoticeSelfApprovalError, NoticeStateError } from '../../domain/errors/notice.errors';
import { publishInstant } from '../../domain/rules/notice-delivery.rules';
import type { NoticePatch, NoticeRecord } from '../../domain/types/notice.types';
import { NOTICE_AUDIT, NOTICE_TOPICS } from '../messages/notice.messages';
import { NoticeAccessPolicy } from '../policies/notice-access.policy';
import { NoticeAuditor } from './notice-auditor.service';
import { NoticeContentService } from './notice-content.service';
import { NoticeDeliveryService, publishKey } from './notice-delivery.service';
import { NoticeNotifier } from './notice-notifier.service';
import { NoticeWorkflow } from './notice-workflow.service';

/** The head's decision: approving (publishing on the day, or at once for a new version) or rejecting with a reason. */
@Injectable()
export class NoticeApprovalService {
  constructor(
    private readonly notices: NoticeRepository,
    private readonly recipients: NoticeDeliveryRepository,
    private readonly policy: NoticeAccessPolicy,
    private readonly content: NoticeContentService,
    private readonly delivery: NoticeDeliveryService,
    private readonly workflow: NoticeWorkflow,
    private readonly notifier: NoticeNotifier,
    private readonly auditor: NoticeAuditor,
    private readonly runner: TransactionRunner,
    private readonly scheduler: JobScheduler,
    private readonly clock: Clock,
  ) {}

  /** The notice waiting for this decision: inside the reach of the key (else «not found»), written by somebody else, and still waiting. */
  private async waiting(ctx: AccessContext, key: string, id: string, seen: number | undefined): Promise<NoticeRecord> {
    const notice = await this.policy.load(ctx, key, id);
    if (notice.authorId === ctx.userId) throw new NoticeSelfApprovalError();
    if (notice.status !== 'pending_approval') throw new NoticeStateError('NOTICE_NOT_PENDING', notice.status);
    this.content.assertRevision(notice, seen);
    return notice;
  }

  async approve(ctx: AccessContext, id: string, input: NoticeActionInput): Promise<void> {
    const notice = await this.waiting(ctx, CorePermission.NoticesApprove, id, input.revision);
    const hasPublished = notice.publishedAt !== null;
    await this.runner.run(async (tx) => {
      const decided: NoticePatch = { approverUserId: ctx.userId, approvedAt: this.clock.now(), rejectReason: null };
      if (hasPublished) await this.publishNewVersion(notice, decided, ctx.userId, tx);
      else await this.approveFirst(notice, decided, ctx.userId, tx);
      await this.tellAuthor('approved', notice, tx);
    });
    this.auditor.record(ctx.userId, NOTICE_AUDIT.approved, { id }, { newVersion: hasPublished });
  }

  /** A first publication: approved now, published on its day (at once when the day has come). */
  private async approveFirst(notice: NoticeRecord, decided: NoticePatch, actorId: string, tx: TransactionContext): Promise<void> {
    this.content.assertPatched(await this.notices.patch(notice.id, notice.revision, { status: 'approved', ...decided }, tx));
    await this.workflow.send(notice.id, { type: 'APPROVE', hasPublished: false }, { actorId, tx });
    const publishOn = notice.publishOn as string;
    if (publishOn <= this.content.today()) await this.delivery.publish(notice.id, actorId, tx);
    else await this.scheduler.schedule(NOTICE_TOPICS.publishDue, { noticeId: notice.id }, { runAt: publishInstant(publishOn), dedupeKey: publishKey(notice.id), tx });
  }

  /** A new version of a published notice is published as soon as it is approved: the people are told, those who acknowledged the old one must acknowledge this one. */
  private async publishNewVersion(notice: NoticeRecord, decided: NoticePatch, actorId: string, tx: TransactionContext): Promise<void> {
    const version = this.content.workingVersion(notice);
    const patch: NoticePatch = { status: 'published', currentVersion: version, batchesDone: 0, deliveryCompletedAt: null, ...decided };
    this.content.assertPatched(await this.notices.patch(notice.id, notice.revision, patch, tx));
    await this.notices.markVersionPublished(notice.id, version, tx);
    if (notice.kind === 'announcement') await this.recipients.clearReads(notice.id, tx);
    await this.workflow.send(notice.id, { type: 'APPROVE', hasPublished: true }, { actorId, tx });
    await this.delivery.queueFirstBatch(notice.id, version, tx);
  }

  async reject(ctx: AccessContext, id: string, input: RejectNoticeInput): Promise<void> {
    const notice = await this.waiting(ctx, CorePermission.NoticesReject, id, input.revision);
    await this.runner.run(async (tx) => {
      this.content.assertPatched(await this.notices.patch(id, notice.revision, { status: 'rejected', rejectReason: input.reason, approverUserId: ctx.userId }, tx));
      await this.workflow.send(id, { type: 'REJECT' }, { actorId: ctx.userId, tx, comment: input.reason });
      await this.tellAuthor('rejected', notice, tx, input.reason);
    });
    this.auditor.record(ctx.userId, NOTICE_AUDIT.rejected, { id });
  }

  private async tellAuthor(kind: 'approved' | 'rejected', notice: NoticeRecord, tx: TransactionContext, reason?: string): Promise<void> {
    const [channel, versions] = await Promise.all([this.notices.channelById(notice.channelId), this.notices.versions(notice.id, tx)]);
    const shown = versions.find((v) => v.version === this.content.workingVersion(notice));
    if (!channel || !shown) return;
    await this.notifier.send({ kind, recipients: [notice.authorId], notice: shown, channel, link: '/notices/manage', email: true, reason, publishOn: notice.publishOn, tx });
  }
}
