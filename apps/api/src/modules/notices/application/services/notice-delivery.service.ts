import { Injectable, Logger } from '@nestjs/common';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner, type TransactionContext } from '../../../../common/application/transaction-runner';
import { PermissionHoldersService } from '../../../../core/access/application/permission-holders.service';
import { JobScheduler, Outbox } from '../../../../core/messaging/application/outbox';
import { CorePermission } from '@arweqah-platform/shared';
import { NoticeDeliveryRepository } from '../../domain/contracts/notice-delivery.repository';
import { NoticeRepository } from '../../domain/contracts/notice.repository';
import { audienceSets } from '../../domain/rules/notice-audience.rules';
import { batchOffset, hasNextBatch } from '../../domain/rules/notice-delivery.rules';
import type { NoticeRecord } from '../../domain/types/notice.types';
import { NOTICE_AUDIT, NOTICE_TOPICS } from '../messages/notice.messages';
import { NoticeAuditor } from './notice-auditor.service';
import { NoticeNotifier } from './notice-notifier.service';
import { NoticeWorkflow } from './notice-workflow.service';

export type BatchJob = { noticeId: string; batchNo: number; version: number; attempt?: number };

const MAX_ATTEMPTS = 3;
const MINUTE = 60_000;

/**
 * Putting a notice in front of its audience: the day it is published (approved → published), the batches that reach the people a few hundred at a time
 * (the first at once, the next ones from `scheduled_jobs`), and the nightly pass that reaches the people who joined the audience after the publication.
 * Every step can run twice without doing its work twice: recipients are added with ON CONFLICT DO NOTHING and a person is notified once per version.
 */
@Injectable()
export class NoticeDeliveryService {
  private readonly logger = new Logger(NoticeDeliveryService.name);

  constructor(
    private readonly notices: NoticeRepository,
    private readonly delivery: NoticeDeliveryRepository,
    private readonly runner: TransactionRunner,
    private readonly outbox: Outbox,
    private readonly scheduler: JobScheduler,
    private readonly notifier: NoticeNotifier,
    private readonly workflow: NoticeWorkflow,
    private readonly auditor: NoticeAuditor,
    private readonly holders: PermissionHoldersService,
    private readonly clock: Clock,
  ) {}

  /** The first batch of a version goes out at once (through the outbox, in the caller's transaction). */
  queueFirstBatch(noticeId: string, version: number, tx: TransactionContext): Promise<void> {
    return this.outbox.enqueue(NOTICE_TOPICS.deliverBatch, { noticeId, batchNo: 1, version } satisfies BatchJob, tx);
  }

  /** Approved → published, inside the caller's transaction (at approval when the day has come); false when the notice is not waiting for its day any more. */
  async publish(noticeId: string, actorId: string | null, tx: TransactionContext): Promise<boolean> {
    const notice = await this.notices.find(noticeId, tx);
    if (!notice || notice.status !== 'approved') return false;
    const patch = { status: 'published', publishedAt: this.clock.now(), currentVersion: 1, batchesDone: 0, deliveryCompletedAt: null } as const;
    if (!(await this.notices.patch(noticeId, notice.revision, patch, tx))) return false;
    await this.notices.markVersionPublished(noticeId, 1, tx);
    await this.workflow.send(noticeId, { type: 'PUBLISH_DUE' }, { actorId, tx });
    await this.queueFirstBatch(noticeId, 1, tx);
    return true;
  }

  /** The durable job of the publish day: does nothing when the notice was archived or changed in the meantime. */
  async publishDue(noticeId: string): Promise<boolean> {
    return this.runner.run((tx) => this.publish(noticeId, null, tx));
  }

  /** One batch: adds its people as recipients, tells those who were not told about this version, and queues the next batch (or finishes). A failure is tried again, then reported. */
  async deliverBatch(job: BatchJob): Promise<void> {
    try {
      await this.runBatch(job);
    } catch (error) {
      await this.failed(job, error);
    }
  }

  private async runBatch(job: BatchJob): Promise<void> {
    const notice = await this.notices.find(job.noticeId);
    if (!notice || notice.status !== 'published' || notice.currentVersion !== job.version) return;
    const settings = await this.notices.settings();
    const sets = audienceSets(await this.notices.audienceOf(notice.id, job.version));
    const [userIds, total] = await Promise.all([this.delivery.audienceSlice(sets, batchOffset(job.batchNo, settings.batchSize), settings.batchSize), this.delivery.countAudience(sets)]);
    const more = hasNextBatch(job.batchNo, settings.batchSize, total);
    await this.runner.run(async (tx) => {
      await this.delivery.addRecipients({ noticeId: notice.id, userIds, joinedAfterPublish: false }, tx);
      await this.tell(notice, { userIds, version: job.version }, tx);
      await this.notices.recordDelivery(notice.id, job.batchNo, !more, tx);
      if (more) await this.scheduleNext(job, settings.batchIntervalMinutes, tx);
      else await this.scheduler.cancel(batchKey(notice.id), tx);
    });
    if (!more) this.auditPublished(notice, job, await this.delivery.recipientCount(notice.id));
  }

  private scheduleNext(job: BatchJob, intervalMinutes: number, tx: TransactionContext): Promise<void> {
    const next: BatchJob = { noticeId: job.noticeId, batchNo: job.batchNo + 1, version: job.version };
    return this.scheduler.schedule(NOTICE_TOPICS.deliverBatch, next, { runAt: new Date(this.clock.now().getTime() + intervalMinutes * MINUTE), dedupeKey: batchKey(job.noticeId), tx });
  }

  /** The people of the batch who were not told about this version yet (the first time, or the first batch of a new version) get the bell and the e-mail. */
  private async tell(notice: NoticeRecord, who: { userIds: string[]; version: number; joinedLater?: boolean }, tx: TransactionContext): Promise<number> {
    const { version } = who;
    const fresh = await this.delivery.markNotified(notice.id, who.userIds, version, tx);
    if (!fresh.length) return 0;
    const [channel, versions] = await Promise.all([this.notices.channelById(notice.channelId), this.notices.versions(notice.id, tx)]);
    const shown = versions.find((v) => v.version === version);
    if (!channel || !shown) return 0;
    const kind = version > 1 && !who.joinedLater ? 'updated' : 'published';
    await this.notifier.send({ kind, recipients: fresh, notice: shown, channel, link: `/notices?open=${notice.id}`, email: true, tx });
    return fresh.length;
  }

  private auditPublished(notice: NoticeRecord, job: BatchJob, recipients: number): void {
    this.auditor.record(null, NOTICE_AUDIT.published, { id: notice.id }, { recipients, batches: job.batchNo, version: job.version });
  }

  /** A failed batch is tried again a few minutes later; after the last attempt it is reported (audit and the platform administrators), never as a success. */
  private async failed(job: BatchJob, error: unknown): Promise<void> {
    const attempt = (job.attempt ?? 1) + 1;
    this.logger.error(`Delivery of notice ${job.noticeId}, batch ${job.batchNo}, failed: ${error instanceof Error ? error.message : String(error)}`);
    if (attempt <= MAX_ATTEMPTS) {
      const settings = await this.notices.settings();
      await this.scheduler.schedule(NOTICE_TOPICS.deliverBatch, { ...job, attempt }, { runAt: new Date(this.clock.now().getTime() + settings.batchIntervalMinutes * MINUTE), dedupeKey: batchKey(job.noticeId) });
      return;
    }
    this.auditor.record(null, NOTICE_AUDIT.batchFailed, { id: job.noticeId }, { batchNo: job.batchNo, version: job.version });
    await this.alertAdministrators(job.noticeId);
  }

  private async alertAdministrators(noticeId: string): Promise<void> {
    const notice = await this.notices.find(noticeId);
    if (!notice) return;
    const [channel, versions, recipients] = await Promise.all([this.notices.channelById(notice.channelId), this.notices.versions(noticeId), this.holders.holdersOf(CorePermission.NoticesSettingsEdit)]);
    const shown = versions[versions.length - 1];
    if (channel && shown) await this.notifier.send({ kind: 'batchFailed', recipients, notice: shown, channel, link: '/notices/manage' });
  }

  /** The nightly pass: every published notice whose delivery finished reaches the people who are in its audience now and were not reached (a new employee, a move, a new member of a group). */
  async catchUp(): Promise<number> {
    let reached = 0;
    for (const notice of await this.delivery.catchUpCandidates()) reached += await this.catchUpOne(notice);
    return reached;
  }

  private async catchUpOne(notice: NoticeRecord): Promise<number> {
    const size = (await this.notices.settings()).batchSize;
    const sets = audienceSets(await this.notices.audienceOf(notice.id, notice.currentVersion));
    let reached = 0;
    for (;;) {
      const added = await this.runner.run(async (tx) => {
        const ids = await this.delivery.addRecipients({ noticeId: notice.id, userIds: await this.delivery.missing(sets, notice.id, size), joinedAfterPublish: true }, tx);
        await this.tell(notice, { userIds: ids, version: notice.currentVersion, joinedLater: true }, tx);
        return ids.length;
      });
      reached += added;
      if (added < size) break;
    }
    if (reached) this.auditor.record(null, NOTICE_AUDIT.catchUp, { id: notice.id }, { reached });
    return reached;
  }
}

/** One pending batch per notice: scheduling the next replaces the pending one, archiving cancels it. */
export const batchKey = (noticeId: string): string => `notice.batch:${noticeId}`;
export const publishKey = (noticeId: string): string => `notice.publish:${noticeId}`;
