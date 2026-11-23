import { Injectable } from '@nestjs/common';
import { CorePermission, type NoticeChannelRefDto, type NoticeHomeDto, type NoticeMineDetailsDto, type NoticeMineQuery, type NoticeMinePageDto } from '@arweqah-platform/shared';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { NoticeDeliveryRepository } from '../../domain/contracts/notice-delivery.repository';
import { NoticeQueryRepository } from '../../domain/contracts/notice-query.repository';
import { NoticeRepository } from '../../domain/contracts/notice.repository';
import { NoticeNoAckRequiredError, NoticeNotFoundError, NoticeStateError } from '../../domain/errors/notice.errors';
import type { MineRow } from '../../domain/types/notice.types';
import { NOTICE_AUDIT } from '../messages/notice.messages';
import { NoticeAccessPolicy } from '../policies/notice-access.policy';
import { NoticeTransformer } from '../transformers/notice.transformer';
import { NoticeAuditor } from './notice-auditor.service';

/** «My notices»: what reached the person, reading it and acknowledging a policy. A notice that did not reach them (or is hidden while a new version is written) is «not found». */
@Injectable()
export class NoticeMineService {
  constructor(
    private readonly queries: NoticeQueryRepository,
    private readonly recipients: NoticeDeliveryRepository,
    private readonly notices: NoticeRepository,
    private readonly policy: NoticeAccessPolicy,
    private readonly transformer: NoticeTransformer,
    private readonly auditor: NoticeAuditor,
  ) {}

  async list(userId: string, query: NoticeMineQuery): Promise<NoticeMinePageDto> {
    const page = await this.queries.listMine({ ...query, userId });
    return { items: page.items.map((row) => this.transformer.toMine(row)), total: page.total, page: page.page, pageSize: page.pageSize, counts: { await: page.awaiting } };
  }

  /** The channels of the notices that reached the person. */
  mineChannels(userId: string): Promise<NoticeChannelRefDto[]> {
    return this.queries.mineChannels(userId);
  }

  async home(ctx: AccessContext): Promise<NoticeHomeDto> {
    const mine = await this.queries.home(ctx.userId);
    const pendingApproval = ctx.has(CorePermission.NoticesApproveView) ? await this.queries.approvalsCount(await this.policy.viewerFor(ctx, CorePermission.NoticesApproveView)) : null;
    return {
      awaiting: mine.awaiting,
      newThisWeek: mine.newThisWeek,
      pendingApproval,
      drafts: ctx.has(CorePermission.NoticesCreate) ? mine.drafts : null,
      pinned: mine.pinned ? this.transformer.toMine(mine.pinned) : null,
      awaitingTop: mine.awaitingTop.map((row) => this.transformer.toMine(row)),
    };
  }

  private async row(userId: string, id: string): Promise<MineRow> {
    const row = await this.queries.mineOne(userId, id);
    if (!row) throw new NoticeNotFoundError();
    return row;
  }

  async details(userId: string, id: string): Promise<NoticeMineDetailsDto> {
    const row = await this.row(userId, id);
    return this.transformer.toMineDetails(row, await this.notices.attachmentsOf(id, row.version));
  }

  /** Opening the notice records the reading (once); an archived notice can still be read. */
  async read(userId: string, id: string): Promise<NoticeMineDetailsDto> {
    await this.row(userId, id);
    await this.recipients.markRead(id, userId);
    return this.details(userId, id);
  }

  /** The person acknowledges the version they were reading. A second acknowledgement changes nothing and succeeds; an announcement needs none; an archived notice is closed. */
  async acknowledge(userId: string, id: string): Promise<NoticeMineDetailsDto> {
    const row = await this.row(userId, id);
    if (row.status === 'archived') throw new NoticeStateError('NOTICE_ARCHIVED', row.status);
    if (row.kind !== 'policy') throw new NoticeNoAckRequiredError();
    const already = row.acknowledgedVersion !== null && row.acknowledgedVersion >= row.version;
    if (!already) {
      await this.recipients.acknowledge(id, userId, row.version);
      this.auditor.record(userId, NOTICE_AUDIT.acknowledged, { id }, { version: row.version });
    }
    return this.details(userId, id);
  }

  /** A file of a notice the person may read (to open or to preview). */
  async attachment(userId: string, id: string, fileId: string): Promise<string> {
    const row = await this.row(userId, id);
    const files = await this.notices.attachmentsOf(id, row.version);
    if (!files.some((f) => f.fileId === fileId)) throw new NoticeNotFoundError();
    return fileId;
  }
}
