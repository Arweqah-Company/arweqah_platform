import { Injectable } from '@nestjs/common';
import {
  CorePermission,
  type NoticeApprovalsQuery,
  type NoticeDetailsDto,
  type NoticeFilterOptionsDto,
  type NoticeListItemDto,
  type NoticeManageQuery,
  type NoticeVersionDto,
  type NoticesPageDto,
  type Paginated,
} from '@arweqah-platform/shared';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { NoticeDirectory } from '../../domain/contracts/notice-directory.port';
import { NoticeQueryRepository } from '../../domain/contracts/notice-query.repository';
import { NoticeRepository } from '../../domain/contracts/notice.repository';
import { NoticeNotFoundError } from '../../domain/errors/notice.errors';
import type { NoticeListRow, NoticeRecord } from '../../domain/types/notice.types';
import { NoticeAccessPolicy } from '../policies/notice-access.policy';
import { NoticeTransformer } from '../transformers/notice.transformer';

/** The manage list, the approvals list and the details of a notice for the people who write, lead and approve. */
@Injectable()
export class NoticeQueryService {
  constructor(
    private readonly queries: NoticeQueryRepository,
    private readonly notices: NoticeRepository,
    private readonly directory: NoticeDirectory,
    private readonly policy: NoticeAccessPolicy,
    private readonly transformer: NoticeTransformer,
  ) {}

  async list(ctx: AccessContext, query: NoticeManageQuery): Promise<NoticesPageDto> {
    const viewer = await this.policy.viewerFor(ctx, CorePermission.NoticesManageView);
    const [page, counts] = await Promise.all([this.queries.listManage({ ...query, viewer }), this.queries.manageCounts(viewer)]);
    return { ...page, items: page.items.map((row) => this.item(ctx, row, viewer.writerChannelIds)), counts };
  }

  async approvals(ctx: AccessContext, query: NoticeApprovalsQuery): Promise<Paginated<NoticeListItemDto>> {
    const viewer = await this.policy.viewerFor(ctx, CorePermission.NoticesApproveView);
    const page = await this.queries.listApprovals({ ...query, viewer });
    return { ...page, items: page.items.map((row) => this.item(ctx, row, viewer.writerChannelIds)) };
  }

  async options(ctx: AccessContext): Promise<NoticeFilterOptionsDto> {
    const viewer = await this.policy.viewerFor(ctx, CorePermission.NoticesManageView);
    const [channels, authors] = await Promise.all([this.notices.channels(), this.queries.authors(viewer)]);
    const writes = new Set(viewer.writerChannelIds);
    const everywhere = this.policy.writesEverywhere(ctx);
    return {
      channels: channels.map((c) => ({ code: c.code, nameAr: c.nameAr, nameEn: c.nameEn, isActive: c.isActive })),
      writableChannelCodes: channels.filter((c) => c.isActive && (everywhere || writes.has(c.id))).map((c) => c.code),
      authors,
    };
  }

  /** The details of a notice, for whoever may manage it or approve it (anyone else: «not found»). */
  async details(ctx: AccessContext, id: string): Promise<NoticeDetailsDto> {
    const notice = await this.loadForDetails(ctx, id);
    const row = (await this.queries.headerOf(id)) as NoticeListRow;
    const writerChannelIds = await this.notices.writerChannelIds(ctx.userId);
    const [versions, approver] = await Promise.all([this.versionsOf(notice), notice.approverUserId ? this.directory.names([notice.approverUserId]) : new Map<string, string>()]);
    return this.transformer.toDetails({
      item: this.item(ctx, row, writerChannelIds),
      row,
      versions,
      rejectReason: notice.rejectReason,
      approver: notice.approverUserId ? { id: notice.approverUserId, name: approver.get(notice.approverUserId) ?? '' } : null,
      canSeeAcknowledgements: this.policy.reaches(ctx, CorePermission.NoticesAckReport, notice, writerChannelIds),
    });
  }

  /** Reached by the key of the manage page, or by the key of the approvals page (the approver opens what waits for them). */
  private async loadForDetails(ctx: AccessContext, id: string): Promise<NoticeRecord> {
    const notice = await this.notices.find(id);
    const writerChannelIds = await this.notices.writerChannelIds(ctx.userId);
    const mayOpen = !!notice && [CorePermission.NoticesManageView, CorePermission.NoticesApproveView].some((key) => this.policy.reaches(ctx, key, notice, writerChannelIds));
    if (!notice || !mayOpen) throw new NoticeNotFoundError();
    return notice;
  }

  private item(ctx: AccessContext, row: NoticeListRow, writerChannelIds: readonly string[]): NoticeListItemDto {
    return this.transformer.toListItem(row, this.policy.abilitiesOf(ctx, row, writerChannelIds));
  }

  /** Every version with its files and audience rules (the published one and, when there is one, the new version waiting). */
  private async versionsOf(notice: NoticeRecord): Promise<NoticeVersionDto[]> {
    const versions = await this.notices.versions(notice.id);
    const parts = await Promise.all(versions.map(async (v) => ({ v, files: await this.notices.attachmentsOf(notice.id, v.version), rules: await this.notices.audienceOf(notice.id, v.version) })));
    const names = await this.directory.ruleNames(parts.flatMap((p) => p.rules));
    return parts.map((p) => this.transformer.toVersion(p.v, { files: p.files, audience: this.transformer.toRules(p.rules, names) }));
  }
}
