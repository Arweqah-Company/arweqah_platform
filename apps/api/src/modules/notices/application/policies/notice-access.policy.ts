import { Injectable } from '@nestjs/common';
import { CorePermission, type NoticeAbilitiesDto } from '@arweqah-platform/shared';
import { ForbiddenError } from '../../../../common/domain/domain-error';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { AbilityFactory } from '../../../../core/access/application/ability.factory';
import { NoticeRepository } from '../../domain/contracts/notice.repository';
import { NoticeChannelDisabledError, NoticeNotAuthorError, NoticeNotChannelWriterError, NoticeNotFoundError } from '../../domain/errors/notice.errors';
import { abilitiesFor } from '../../domain/rules/notice-abilities.rules';
import type { NoticeFacts, NoticeListViewer, NoticeRecord } from '../../domain/types/notice.types';

/** The keys whose «own» reach also covers the notices of the channels the person writes in (the others reach only what the person wrote). */
const CHANNEL_KEYS: readonly string[] = [CorePermission.NoticesManageView, CorePermission.NoticesArchive, CorePermission.NoticesAckReport, CorePermission.NoticesAckExport, CorePermission.NoticesExport];

/** Who may see and do what with one notice. Out of reach is «not found», never «forbidden» (a person must not learn that a notice exists). */
@Injectable()
export class NoticeAccessPolicy {
  constructor(
    private readonly abilities: AbilityFactory,
    private readonly notices: NoticeRepository,
  ) {}

  /** The viewer of a list: how far the key reaches and which channels the person writes in. */
  async viewerFor(ctx: AccessContext, key: string): Promise<NoticeListViewer> {
    const scope = ctx.filterFor(key);
    if (!scope) throw new ForbiddenError();
    return { userId: ctx.userId, scope, writerChannelIds: await this.notices.writerChannelIds(ctx.userId) };
  }

  /** Does the key reach the notice: the person wrote it, writes in its channel (for the keys of the manage page), or it was written inside the scope of the key. */
  reaches(ctx: AccessContext, key: string, notice: NoticeFacts, writerChannelIds: readonly string[]): boolean {
    if (!ctx.has(key)) return false;
    if (CHANNEL_KEYS.includes(key) && writerChannelIds.includes(notice.channelId)) return true;
    return this.abilities.can(ctx, key, { ownerId: notice.authorId, orgNodeId: notice.authorUnitId, companyId: notice.unitCompanyId });
  }

  /** The notice, when the person's key reaches it; otherwise «not found». */
  async load(ctx: AccessContext, key: string, id: string): Promise<NoticeRecord> {
    const notice = await this.notices.find(id);
    if (!notice || !this.reaches(ctx, key, notice, await this.notices.writerChannelIds(ctx.userId))) throw new NoticeNotFoundError();
    return notice;
  }

  /** The notice for what only its writer does (edit, send, delete, a new version): another person who can see it is told so (403); one who cannot see it gets 404. */
  async loadOwn(ctx: AccessContext, key: string, id: string): Promise<NoticeRecord> {
    const notice = await this.load(ctx, CorePermission.NoticesManageView, id);
    if (notice.authorId !== ctx.userId) throw new NoticeNotAuthorError();
    if (!ctx.has(key)) throw new ForbiddenError();
    return notice;
  }

  /** The platform administrator (the key to write at the reach «all») writes in every active channel without being added as a writer; everybody else only in the channels they were added to. */
  writesEverywhere(ctx: AccessContext): boolean {
    return ctx.scopeOf(CorePermission.NoticesCreate) === 'all';
  }

  /** Only a writer of the channel writes in it (the role gives the keys; the membership says which channel; the platform administrator needs no membership), and nobody writes in a disabled channel. */
  async assertWriter(ctx: AccessContext, channelId: string): Promise<void> {
    if (!this.writesEverywhere(ctx) && !(await this.notices.isWriter(ctx.userId, channelId))) throw new NoticeNotChannelWriterError();
    if (!(await this.notices.channelById(channelId))?.isActive) throw new NoticeChannelDisabledError();
  }

  /** The icons of a row: each needs its key, its relation to the notice, and a state the machine accepts. */
  abilitiesOf(ctx: AccessContext, notice: NoticeFacts, writerChannelIds: readonly string[]): NoticeAbilitiesDto {
    const facts = { status: notice.status, hasPublished: notice.publishedAt !== null, isAuthor: notice.authorId === ctx.userId, isPinned: notice.isPinned };
    return abilitiesFor(facts, { has: (key) => ctx.has(key), reaches: (key) => this.reaches(ctx, key, notice, writerChannelIds) });
  }
}
