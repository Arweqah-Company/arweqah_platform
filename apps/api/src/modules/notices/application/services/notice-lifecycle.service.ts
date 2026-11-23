import { Injectable } from '@nestjs/common';
import { CorePermission, type NoticeActionInput } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { JobScheduler } from '../../../../core/messaging/application/outbox';
import { NoticeRepository } from '../../domain/contracts/notice.repository';
import { NoticeStateError } from '../../domain/errors/notice.errors';
import { canHappen } from '../../domain/rules/notice-machine';
import { NOTICE_AUDIT } from '../messages/notice.messages';
import { NoticeAccessPolicy } from '../policies/notice-access.policy';
import { NoticeAuditor } from './notice-auditor.service';
import { NoticeContentService } from './notice-content.service';
import { batchKey, publishKey } from './notice-delivery.service';
import { NoticeWorkflow } from './notice-workflow.service';

/** Pinning one notice on the home page and archiving a notice. */
@Injectable()
export class NoticeLifecycleService {
  constructor(
    private readonly notices: NoticeRepository,
    private readonly policy: NoticeAccessPolicy,
    private readonly content: NoticeContentService,
    private readonly workflow: NoticeWorkflow,
    private readonly auditor: NoticeAuditor,
    private readonly runner: TransactionRunner,
    private readonly scheduler: JobScheduler,
    private readonly clock: Clock,
  ) {}

  /** One notice is pinned for the whole company: the pin of the previous one is taken off in the same transaction (the unique index keeps it so). */
  async pin(ctx: AccessContext, id: string, input: NoticeActionInput): Promise<void> {
    const notice = await this.policy.load(ctx, CorePermission.NoticesPin, id);
    if (notice.status !== 'published') throw new NoticeStateError(notice.status === 'archived' ? 'NOTICE_ARCHIVED' : 'NOTICE_NOT_PUBLISHED', notice.status);
    this.content.assertRevision(notice, input.revision);
    try {
      await this.pinNow(id);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      await this.pinNow(id); // another pin won the race: this one now takes its place
    }
    this.auditor.record(ctx.userId, NOTICE_AUDIT.pinned, { id });
  }

  private pinNow(id: string): Promise<void> {
    return this.runner.run(async (tx) => {
      await this.notices.unpinAll(tx);
      const current = await this.notices.find(id, tx);
      this.content.assertPatched(!!current && (await this.notices.patch(id, current.revision, { isPinned: true, pinnedAt: this.clock.now() }, tx)));
    });
  }

  /** Takes the pin off (nothing happens when the notice is not pinned). */
  async unpin(ctx: AccessContext, id: string): Promise<void> {
    const notice = await this.policy.load(ctx, CorePermission.NoticesPin, id);
    if (!notice.isPinned) return;
    await this.runner.run(async (tx) => {
      this.content.assertPatched(await this.notices.patch(id, notice.revision, { isPinned: false, pinnedAt: null }, tx));
    });
    this.auditor.record(ctx.userId, NOTICE_AUDIT.unpinned, { id });
  }

  /** The notice stops being in force: it leaves «my notices» and the pending list, its pin and its undelivered batches are cancelled, and the report stays. */
  async archive(ctx: AccessContext, id: string, input: NoticeActionInput): Promise<void> {
    const notice = await this.policy.load(ctx, CorePermission.NoticesArchive, id);
    const hasPublished = notice.publishedAt !== null;
    if (!canHappen(notice.status, { type: 'ARCHIVE', hasPublished })) throw new NoticeStateError(notice.status === 'archived' ? 'NOTICE_ARCHIVED' : 'NOTICE_NOT_PUBLISHED', notice.status);
    this.content.assertRevision(notice, input.revision);
    await this.runner.run(async (tx) => {
      if (hasPublished && notice.status !== 'published') {
        await this.notices.removeParts(id, this.content.workingVersion(notice), tx);
        await this.notices.removeVersion(id, this.content.workingVersion(notice), tx);
      }
      const patch = { status: 'archived', archivedAt: this.clock.now(), isPinned: false, pinnedAt: null } as const;
      this.content.assertPatched(await this.notices.patch(id, notice.revision, patch, tx));
      await this.workflow.send(id, { type: 'ARCHIVE', hasPublished }, { actorId: ctx.userId, tx });
      await this.scheduler.cancel(publishKey(id), tx);
      await this.scheduler.cancel(batchKey(id), tx);
    });
    this.auditor.record(ctx.userId, NOTICE_AUDIT.archived, { id });
  }
}

/** PostgreSQL's «unique violation»: two pins at once, the loser of the race fails on the index that allows only one pinned notice. */
function isUniqueViolation(error: unknown): boolean {
  return (error as { driverError?: { code?: string } }).driverError?.code === '23505';
}
