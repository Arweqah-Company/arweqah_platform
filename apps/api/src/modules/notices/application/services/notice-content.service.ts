import { Injectable } from '@nestjs/common';
import { riyadhToday, type UpdateNoticeInput } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/application/transaction-runner';
import { Clock } from '../../../../common/application/clock';
import { NotFoundError } from '../../../../common/domain/domain-error';
import { FilesService } from '../../../../core/files/application/files.service';
import { NoticeRepository } from '../../domain/contracts/notice.repository';
import { NoticeBodyEmptyError, NoticeFilesInvalidError, NoticePublishDateError, NoticeRevisionConflictError } from '../../domain/errors/notice.errors';
import { hasText, sanitizeNoticeBody } from '../../domain/rules/notice-content.rules';
import type { AudienceRuleRow, NoticeRecord } from '../../domain/types/notice.types';

/** What the content of a version is made of: the title, the text, the audience rules and the files. */
export interface VersionInput {
  titleAr: string;
  titleEn?: string | null;
  body: string;
  fileIds: string[];
}

/** The checks and the writing shared by creating, editing and starting a new version of a notice. */
@Injectable()
export class NoticeContentService {
  constructor(
    private readonly notices: NoticeRepository,
    private readonly files: FilesService,
    private readonly clock: Clock,
  ) {}

  today(): string {
    return riyadhToday(this.clock.now());
  }

  /** A publish date is today (Riyadh) or later. */
  assertPublishDate(publishOn: string | null | undefined): string {
    if (!publishOn) throw new NoticePublishDateError('NOTICE_PUBLISH_DATE_REQUIRED');
    if (publishOn < this.today()) throw new NoticePublishDateError('NOTICE_PUBLISH_DATE_PAST');
    return publishOn;
  }

  /** The files must be the writer's own uploads (somebody else's file is refused, never confirmed to exist). */
  async assertFiles(userId: string, fileIds: string[]): Promise<void> {
    for (const id of fileIds) {
      try {
        await this.files.getOwned(id, userId);
      } catch (error) {
        throw error instanceof NotFoundError ? new NoticeFilesInvalidError() : error;
      }
    }
  }

  /** Optimistic check: when the caller says which revision it saw, the notice must still be at it. */
  assertRevision(notice: NoticeRecord, seen: number | undefined): void {
    if (seen !== undefined && seen !== notice.revision) throw new NoticeRevisionConflictError();
  }

  /** A write that found the notice at another revision than the one read means somebody changed it first. */
  assertPatched(patched: boolean): void {
    if (!patched) throw new NoticeRevisionConflictError();
  }

  /** Writes the title and text (the text cleaned of anything dangerous), the audience rules and the files of one version. */
  async writeVersion(target: { noticeId: string; version: number }, content: VersionInput, rules: AudienceRuleRow[], tx: TransactionContext): Promise<void> {
    const { noticeId, version } = target;
    const body = sanitizeNoticeBody(content.body);
    if (!hasText(body)) throw new NoticeBodyEmptyError();
    await this.notices.saveVersion(noticeId, version, { titleAr: content.titleAr, titleEn: content.titleEn || null, body }, tx);
    await this.notices.replaceAudience(noticeId, version, rules, tx);
    await this.notices.replaceAttachments(noticeId, version, content.fileIds, tx);
  }

  /** The version a draft, a rejected notice or a notice being revised is working on: the one after the last published. */
  workingVersion(notice: NoticeRecord): number {
    return notice.currentVersion + 1;
  }
}

export type EditInput = Pick<UpdateNoticeInput, 'titleAr' | 'titleEn' | 'body' | 'fileIds'>;
