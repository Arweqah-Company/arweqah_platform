import { Injectable } from '@nestjs/common';
import {
  CorePermission,
  type NoticeAcknowledgementsDto,
  type NoticeAcknowledgementsQuery,
  type NoticeAudienceReportDto,
  type NoticeFlowDto,
  type NoticeFlowStepDto,
} from '@arweqah-platform/shared';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { NoticeDirectory } from '../../domain/contracts/notice-directory.port';
import { NoticeQueryRepository } from '../../domain/contracts/notice-query.repository';
import type { PeopleScope } from '../../domain/contracts/notice-channel.repository';
import { NoticeRepository } from '../../domain/contracts/notice.repository';
import { ackStateOf } from '../../domain/rules/notice-delivery.rules';
import { peopleScopeOf } from '../../domain/rules/notice-scope.rules';
import type { FlowRow, NoticeRecord } from '../../domain/types/notice.types';
import { NoticeAccessPolicy } from '../policies/notice-access.policy';
import { NoticeTransformer, ackProgress } from '../transformers/notice.transformer';

const STEP_EVENTS: Record<string, NoticeFlowStepDto['event'] | undefined> = {
  SUBMIT: 'submitted',
  APPROVE: 'approved',
  REJECT: 'rejected',
  PUBLISH_DUE: 'published',
  REVISE: 'revision_started',
  REVISE_CANCEL: 'revision_cancelled',
  ARCHIVE: 'archived',
};

/** The three reports of a notice for those who manage it: the timeline, the audience, and who acknowledged. */
@Injectable()
export class NoticeReportService {
  constructor(
    private readonly queries: NoticeQueryRepository,
    private readonly notices: NoticeRepository,
    private readonly directory: NoticeDirectory,
    private readonly policy: NoticeAccessPolicy,
    private readonly transformer: NoticeTransformer,
  ) {}

  async flow(ctx: AccessContext, id: string): Promise<NoticeFlowDto> {
    const notice = await this.policy.load(ctx, CorePermission.NoticesManageView, id);
    const [rows, recipients, progress] = await Promise.all([this.queries.flow(id), this.queries.ackSummary({ noticeId: id, currentVersion: notice.currentVersion, unitScope: null }), this.approverOf(notice)]);
    const names = await this.directory.names([...new Set([notice.authorId, ...rows.map((r) => r.actorId).filter((a): a is string => !!a)])]);
    const steps = [this.created(notice, names), ...rows.flatMap((row) => this.step(row, names, notice))];
    return {
      steps,
      approver: progress.approver,
      approverUnit: progress.unit,
      delivery: { batchesDone: notice.batchesDone, recipients: recipients.reached, completed: notice.deliveryCompletedAt !== null },
      ack: notice.kind === 'policy' && notice.currentVersion > 0 ? ackProgress(recipients.acknowledged, recipients.reached) : null,
    };
  }

  private async approverOf(notice: NoticeRecord) {
    const approver = notice.approverUserId ? { id: notice.approverUserId, name: (await this.directory.names([notice.approverUserId])).get(notice.approverUserId) ?? '' } : null;
    const header = await this.queries.headerOf(notice.id);
    const unit = header?.authorUnitId ? { id: header.authorUnitId, nameAr: header.unitNameAr ?? '', nameEn: header.unitNameEn ?? '' } : null;
    return { approver, unit };
  }

  private created(notice: NoticeRecord, names: Map<string, string>): NoticeFlowStepDto {
    return { event: 'created', at: notice.createdAt.toISOString(), actor: { id: notice.authorId, name: names.get(notice.authorId) ?? '' }, reason: null, version: null };
  }

  private step(row: FlowRow, names: Map<string, string>, notice: NoticeRecord): NoticeFlowStepDto[] {
    const event = STEP_EVENTS[row.event];
    if (!event) return [];
    const actor = row.actorId ? { id: row.actorId, name: names.get(row.actorId) ?? '' } : null;
    const reason = event === 'rejected' ? row.comment : null;
    const version = ['revision_started', 'revision_cancelled'].includes(event) && row.comment ? Number(row.comment) : event === 'published' ? notice.currentVersion : null;
    return [{ event, at: row.createdAt.toISOString(), actor, reason, version }];
  }

  async audience(ctx: AccessContext, id: string): Promise<NoticeAudienceReportDto> {
    const notice = await this.policy.load(ctx, CorePermission.NoticesManageView, id);
    const rules = await this.notices.audienceOf(id, notice.currentVersion || 1);
    const names = await this.directory.ruleNames(rules);
    const [summary, joinedAfterPublish] = await Promise.all([this.queries.ackSummary({ noticeId: id, currentVersion: notice.currentVersion, unitScope: null }), this.queries.joinedLater(id)]);
    return { rules: this.transformer.toRules(rules, names), recipients: summary.reached, joinedAfterPublish };
  }

  /** Who the report may show: everyone the notice reached for its writer (and the writers of its channel); the people of the unit and below for a head; everyone with the widest scope. */
  private async scopeFor(ctx: AccessContext, notice: NoticeRecord): Promise<PeopleScope | null> {
    if (notice.authorId === ctx.userId || (await this.notices.writerChannelIds(ctx.userId)).includes(notice.channelId)) return null;
    const filter = ctx.filterFor(CorePermission.NoticesAckReport);
    const scope = filter ? peopleScopeOf(filter) : ({ kind: 'none' } as const);
    return scope.kind === 'all' ? null : scope;
  }

  async acknowledgements(ctx: AccessContext, id: string, query: NoticeAcknowledgementsQuery): Promise<NoticeAcknowledgementsDto> {
    const notice = await this.policy.load(ctx, CorePermission.NoticesAckReport, id);
    if (notice.currentVersion === 0) return { items: [], total: 0, page: query.page, pageSize: query.pageSize, summary: { reached: 0, acknowledged: 0, pending: 0 } };
    const unitScope = await this.scopeFor(ctx, notice);
    const base = { noticeId: id, currentVersion: notice.currentVersion, unitScope };
    const [page, summary] = await Promise.all([this.queries.acknowledgements({ ...base, ...query }), this.queries.ackSummary(base)]);
    const items = page.items.map((r) => ({
      userId: r.userId,
      name: r.name,
      unit: r.unitId ? { id: r.unitId, nameAr: r.unitNameAr ?? '', nameEn: r.unitNameEn ?? '' } : null,
      deliveredAt: r.deliveredAt.toISOString(),
      acknowledgedAt: r.acknowledgedAt ? r.acknowledgedAt.toISOString() : null,
      acknowledgedVersion: r.acknowledgedVersion,
      state: ackStateOf(r, notice.currentVersion),
    }));
    return { ...page, items, summary: { reached: summary.reached, acknowledged: summary.acknowledged, pending: summary.pending } };
  }
}
