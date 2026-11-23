import { Injectable } from '@nestjs/common';
import type {
  FileDto,
  NoticeAbilitiesDto,
  NoticeAckProgressDto,
  NoticeAudienceRuleDto,
  NoticeChannelDto,
  NoticeDetailsDto,
  NoticeListItemDto,
  NoticeMineDetailsDto,
  NoticeMineItemDto,
  NoticeType,
  NoticeVersionDto,
  NoticeWriterCandidateDto,
  NoticeWriterDto,
} from '@arweqah-platform/shared';
import type { RuleName } from '../../domain/contracts/notice-directory.port';
import type { NoticeVersion } from '../../domain/entities/notice.entities';
import { excerptOf } from '../../domain/rules/notice-content.rules';
import { myStateOf } from '../../domain/rules/notice-delivery.rules';
import type { AttachmentRow, AudienceRuleRow, CandidateRow, ChannelRow, MineRow, NoticeListRow, WriterRow } from '../../domain/types/notice.types';

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

/** Is the notice a published policy (the only kind with an acknowledgement rate)? */
const isPublishedPolicy = (kind: NoticeType, status: string): boolean => kind === 'policy' && status === 'published';

export function ackProgress(acknowledged: number, total: number): NoticeAckProgressDto {
  return { acknowledged, total, percent: total === 0 ? 0 : Math.floor((acknowledged * 100) / total) };
}

export const toFileDto = (a: AttachmentRow): FileDto => ({ id: a.fileId, originalName: a.originalName, contentType: a.contentType, size: a.size, createdAt: a.createdAt.toISOString() });

/** Turns rows into the shapes of `@arweqah-platform/shared` (no rules here: only naming and formatting). */
@Injectable()
export class NoticeTransformer {
  toListItem(row: NoticeListRow, abilities: NoticeAbilitiesDto): NoticeListItemDto {
    return {
      id: row.id,
      channel: { code: row.channelCode, nameAr: row.channelNameAr, nameEn: row.channelNameEn },
      kind: row.kind,
      status: row.status,
      version: row.version,
      titleAr: row.titleAr,
      titleEn: row.titleEn,
      author: { id: row.authorId, name: row.authorName },
      authorUnit: row.authorUnitId ? { id: row.authorUnitId, nameAr: row.unitNameAr ?? '', nameEn: row.unitNameEn ?? '' } : null,
      publishOn: row.publishOn,
      publishedAt: iso(row.publishedAt),
      submittedAt: iso(row.submittedAt),
      createdAt: row.createdAt.toISOString(),
      isPinned: row.isPinned,
      hiddenForRevision: row.publishedAt !== null && ['revising', 'pending_approval', 'rejected'].includes(row.status),
      audience: { all: row.audienceAll, rules: row.audienceRules, recipients: row.publishedAt ? row.recipients : null },
      ack: isPublishedPolicy(row.kind, row.status) ? ackProgress(row.acknowledged, row.recipients) : null,
      abilities,
    };
  }

  toRules(rules: AudienceRuleRow[], names: Map<string, RuleName>): NoticeAudienceRuleDto[] {
    return rules.map((r) => {
      const name = r.refId ? names.get(`${r.type}:${r.refId}`) : undefined;
      return { type: r.type as NoticeAudienceRuleDto['type'], refId: r.refId, includeBelow: r.includeBelow, nameAr: name?.nameAr ?? null, nameEn: name?.nameEn ?? null };
    });
  }

  toVersion(v: NoticeVersion, parts: { files: AttachmentRow[]; audience: NoticeAudienceRuleDto[] }): NoticeVersionDto {
    return { version: v.version, isDraft: v.isDraft, titleAr: v.titleAr, titleEn: v.titleEn, body: v.body, files: parts.files.map(toFileDto), audience: parts.audience, createdAt: v.createdAt.toISOString() };
  }

  toDetails(input: { item: NoticeListItemDto; row: NoticeListRow; versions: NoticeVersionDto[]; rejectReason: string | null; approver: { id: string; name: string } | null; canSeeAcknowledgements: boolean }): NoticeDetailsDto {
    const shown = input.versions.find((v) => v.version === input.row.version) ?? (input.versions[input.versions.length - 1] as NoticeVersionDto);
    return {
      ...input.item,
      body: shown.body,
      files: shown.files,
      audienceRules: shown.audience,
      rejectReason: input.rejectReason,
      approver: input.approver,
      versions: input.versions,
      canSeeAcknowledgements: input.canSeeAcknowledgements,
      revision: input.row.revision,
    };
  }

  toMine(row: MineRow): NoticeMineItemDto {
    const state = myStateOf(row.kind, row.acknowledgedVersion, row.version);
    return {
      id: row.id,
      channel: { code: row.channelCode, nameAr: row.channelNameAr, nameEn: row.channelNameEn },
      kind: row.kind,
      titleAr: row.titleAr,
      titleEn: row.titleEn,
      excerpt: excerptOf(row.body),
      publishedAt: row.publishedAt.toISOString(),
      isPinned: row.isPinned,
      isArchived: row.status === 'archived',
      version: row.version,
      myState: state,
      readAt: iso(row.readAt),
      acknowledgedAt: iso(row.acknowledgedAt),
      acknowledgedOlderVersion: row.acknowledgedVersion !== null && row.acknowledgedVersion < row.version,
    };
  }

  toMineDetails(row: MineRow, files: AttachmentRow[]): NoticeMineDetailsDto {
    return { ...this.toMine(row), body: row.body, files: files.map(toFileDto) };
  }

  toWriter(row: WriterRow, canRemove: boolean): NoticeWriterDto {
    return {
      userId: row.userId,
      employeeId: row.employeeId,
      name: row.name,
      jobTitle: row.jobTitleAr || row.jobTitleEn ? { nameAr: row.jobTitleAr ?? row.jobTitleEn ?? '', nameEn: row.jobTitleEn ?? row.jobTitleAr ?? '' } : null,
      unit: row.unitId ? { id: row.unitId, nameAr: row.unitNameAr ?? '', nameEn: row.unitNameEn ?? '' } : null,
      addedAt: row.addedAt.toISOString(),
      canRemove,
      drafts: row.drafts,
      pendingApproval: row.pendingApproval,
    };
  }

  toChannel(row: ChannelRow, writers: NoticeWriterDto[], can: Pick<NoticeChannelDto, 'canAddWriter' | 'canRemoveWriter' | 'canRename' | 'canToggle' | 'canDelete'>): NoticeChannelDto {
    return {
      id: row.id,
      code: row.code,
      nameAr: row.nameAr,
      nameEn: row.nameEn,
      unit: row.unitId ? { id: row.unitId, nameAr: row.unitNameAr ?? row.unitNameEn ?? '', nameEn: row.unitNameEn ?? row.unitNameAr ?? '' } : null,
      isActive: row.isActive,
      writerRoleId: row.writerRoleId,
      writersCount: row.writersCount,
      noticesCount: row.noticesCount,
      updatedAt: row.updatedAt.toISOString(),
      ...can,
      writers,
    };
  }

  toCandidate(row: CandidateRow): NoticeWriterCandidateDto {
    return {
      employeeId: row.employeeId,
      userId: row.userId,
      name: row.name,
      jobTitle: row.jobTitleAr || row.jobTitleEn ? { nameAr: row.jobTitleAr ?? row.jobTitleEn ?? '', nameEn: row.jobTitleEn ?? row.jobTitleAr ?? '' } : null,
      unit: row.unitId ? { id: row.unitId, nameAr: row.unitNameAr ?? '', nameEn: row.unitNameEn ?? '' } : null,
      hasNoApprover: row.hasNoApprover,
    };
  }
}
