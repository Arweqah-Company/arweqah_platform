import { Injectable } from '@nestjs/common';
import type { NoticeAudienceCountDto, NoticeAudienceOptionsDto } from '@arweqah-platform/shared';
import { NoticeDeliveryRepository } from '../../domain/contracts/notice-delivery.repository';
import { NoticeDirectory } from '../../domain/contracts/notice-directory.port';
import { NoticeAudienceEmptyError, NoticeAudienceInvalidError } from '../../domain/errors/notice.errors';
import { audienceSets, normalizeAudience, referencedIds, type AudienceLike } from '../../domain/rules/notice-audience.rules';
import type { AudienceRuleRow } from '../../domain/types/notice.types';

/** The audience of a notice as rules: checked when it is written, counted when it is shown (the people are worked out when it is published). */
@Injectable()
export class NoticeAudienceService {
  constructor(
    private readonly directory: NoticeDirectory,
    private readonly delivery: NoticeDeliveryRepository,
  ) {}

  /** The rules as they are stored (`all` alone, no repeats); a unit, title or group that does not exist is refused. */
  async validate(rules: readonly AudienceLike[]): Promise<AudienceRuleRow[]> {
    const wanted = referencedIds(rules);
    const found = await this.directory.existingRefs(wanted);
    const missing = wanted.units.some((id) => !found.units.has(id)) || wanted.titles.some((id) => !found.titles.has(id)) || wanted.groups.some((id) => !found.groups.has(id));
    if (missing) throw new NoticeAudienceInvalidError();
    return normalizeAudience(rules);
  }

  /** The choices of the audience picker for any channel writer (not narrowed by the writer's own reach: a notice may be aimed at any unit). */
  options(search: string | undefined): Promise<NoticeAudienceOptionsDto> {
    return this.directory.audienceOptions(search?.trim() || undefined);
  }

  /** How many active employees the rules reach right now (none when there are no rules). */
  async count(rules: readonly AudienceLike[]): Promise<NoticeAudienceCountDto> {
    if (!rules.length) return { count: 0 };
    return { count: await this.delivery.countAudience(audienceSets(rules)) };
  }

  /** A notice may be sent for approval only when its audience reaches somebody. */
  async assertReaches(rules: readonly AudienceLike[]): Promise<void> {
    if ((await this.count(rules)).count === 0) throw new NoticeAudienceEmptyError();
  }
}
