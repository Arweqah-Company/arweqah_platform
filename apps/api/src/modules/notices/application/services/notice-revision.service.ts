import { Injectable } from '@nestjs/common';
import { CorePermission, type NoticeActionInput } from '@arweqah-platform/shared';
import { TransactionRunner, type TransactionContext } from '../../../../common/application/transaction-runner';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { NoticeDirectory } from '../../domain/contracts/notice-directory.port';
import { NoticeRepository } from '../../domain/contracts/notice.repository';
import { NoticeStateError } from '../../domain/errors/notice.errors';
import { canHappen } from '../../domain/rules/notice-machine';
import type { NoticePatch, NoticeRecord } from '../../domain/types/notice.types';
import { NOTICE_AUDIT } from '../messages/notice.messages';
import { NoticeAccessPolicy } from '../policies/notice-access.policy';
import { NoticeAuditor } from './notice-auditor.service';
import { NoticeContentService } from './notice-content.service';
import { NoticeNotifier } from './notice-notifier.service';
import { NoticeWorkflow } from './notice-workflow.service';

/** A new version of a published notice (decision N9): it hides the published one, goes to approval, and can be cancelled to bring the published one back. */
@Injectable()
export class NoticeRevisionService {
  constructor(
    private readonly notices: NoticeRepository,
    private readonly directory: NoticeDirectory,
    private readonly policy: NoticeAccessPolicy,
    private readonly content: NoticeContentService,
    private readonly workflow: NoticeWorkflow,
    private readonly notifier: NoticeNotifier,
    private readonly auditor: NoticeAuditor,
    private readonly runner: TransactionRunner,
  ) {}

  /** Starts a new version as a copy of the published one: the notice disappears for the employees at once (their acknowledgements stay as they are) and loses its pin. */
  async revise(ctx: AccessContext, id: string, input: NoticeActionInput): Promise<void> {
    const notice = await this.policy.loadOwn(ctx, CorePermission.NoticesRevise, id);
    if (!canHappen(notice.status, { type: 'REVISE' })) throw new NoticeStateError('NOTICE_NOT_PUBLISHED', notice.status);
    this.content.assertRevision(notice, input.revision);
    const version = this.content.workingVersion(notice);
    await this.runner.run(async (tx) => {
      const current = (await this.notices.versions(id, tx)).find((v) => v.version === notice.currentVersion);
      await this.notices.saveVersion(id, version, { titleAr: current?.titleAr ?? '', titleEn: current?.titleEn ?? null, body: current?.body ?? '' }, tx);
      await this.notices.copyParts(id, notice.currentVersion, version, tx);
      const patch: NoticePatch = { status: 'revising', isPinned: false, pinnedAt: null, publishOn: null };
      this.content.assertPatched(await this.notices.patch(id, notice.revision, patch, tx));
      await this.workflow.send(id, { type: 'REVISE' }, { actorId: ctx.userId, tx, comment: String(version) });
    });
    this.auditor.record(ctx.userId, NOTICE_AUDIT.revisionStarted, { id }, { version });
  }

  /** Throws the new version away and brings the published one back at once, with the acknowledgements it had (nothing is sent to the audience: nothing changed for them). */
  async cancel(ctx: AccessContext, id: string, input: NoticeActionInput): Promise<void> {
    const notice = await this.policy.loadOwn(ctx, CorePermission.NoticesReviseCancel, id);
    const hasPublished = notice.publishedAt !== null;
    if (!canHappen(notice.status, { type: 'REVISE_CANCEL', hasPublished })) throw new NoticeStateError('NOTICE_NOT_REVISING', notice.status);
    this.content.assertRevision(notice, input.revision);
    const version = this.content.workingVersion(notice);
    const wasWaiting = notice.status === 'pending_approval';
    await this.runner.run(async (tx) => {
      await this.notices.removeParts(id, version, tx);
      await this.notices.removeVersion(id, version, tx);
      const patch: NoticePatch = { status: 'published', rejectReason: null, submittedAt: null, approverUserId: null };
      this.content.assertPatched(await this.notices.patch(id, notice.revision, patch, tx));
      await this.workflow.send(id, { type: 'REVISE_CANCEL', hasPublished }, { actorId: ctx.userId, tx, comment: String(notice.currentVersion) });
      if (wasWaiting) await this.withdrawn(ctx, notice, tx);
    });
    this.auditor.record(ctx.userId, NOTICE_AUDIT.revisionCancelled, { id }, { version });
  }

  /** The head who was asked to approve the new version is told the request was withdrawn. */
  private async withdrawn(ctx: AccessContext, notice: NoticeRecord, tx: TransactionContext): Promise<void> {
    if (!notice.approverUserId) return;
    const [channel, versions] = await Promise.all([this.notices.channelById(notice.channelId), this.notices.versions(notice.id, tx)]);
    const shown = versions.find((v) => v.version === notice.currentVersion);
    if (channel && shown) await this.notifier.send({ kind: 'withdrawn', recipients: [notice.approverUserId], notice: shown, channel, link: '/notices/approvals', authorName: (await this.directory.names([ctx.userId])).get(ctx.userId) ?? '', tx });
  }
}
