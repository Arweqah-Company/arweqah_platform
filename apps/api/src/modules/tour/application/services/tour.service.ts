import { Injectable } from '@nestjs/common';
import { CorePermission, type TourDto, type TourId, type TourStepDef, type TourStepKey } from '@arweqah-platform/shared';
import { NotFoundError } from '../../../../common/domain/domain-error';
import { PageVisibilityService } from '../../../../core/access/application/page-visibility.service';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { TourRepository } from '../../domain/contracts/tour.repository';
import type { TourStepSetting } from '../../domain/entities/tour.entities';
import { sortedSteps } from '../../domain/rules/tour-steps.rules';
import { toStepDto } from '../transformers/tour.transformer';

/** A person's own tour: the steps they may see (their permissions, the pages hidden from them, what the administrator switched off), and how far they got. */
@Injectable()
export class TourService {
  constructor(
    private readonly repo: TourRepository,
    private readonly pages: PageVisibilityService,
  ) {}

  async get(ctx: AccessContext, tour: TourId): Promise<TourDto> {
    const { steps, rows } = await this.visible(ctx, tour);
    const progress = await this.repo.progress(ctx.userId, tour);
    const seen = new Set(progress?.seenSteps ?? []);
    return {
      tour,
      status: progress?.status ?? 'none',
      steps: steps.map((s) => toStepDto(s, rows.get(s.key))),
      newSteps: progress ? steps.filter((s) => !seen.has(s.key)).map((s) => s.key as TourStepKey) : [],
    };
  }

  /**
   * Finished or skipped: every step shown today counts as seen, so a later release offers only what is new. What was seen before stays seen:
   * finishing with fewer steps visible (admin mode off, a page hidden meanwhile) must not make the others «new» the next time they show.
   */
  async finish(ctx: AccessContext, tour: TourId, status: 'completed' | 'skipped'): Promise<TourDto> {
    const { steps } = await this.visible(ctx, tour);
    const before = (await this.repo.progress(ctx.userId, tour))?.seenSteps ?? [];
    await this.repo.saveProgress(ctx.userId, tour, status, [...new Set([...before, ...steps.map((s) => s.key)])]);
    return this.get(ctx, tour);
  }

  async restart(ctx: AccessContext, tour: TourId): Promise<TourDto> {
    await this.visible(ctx, tour);
    await this.repo.clearProgress(ctx.userId, tour);
    return this.get(ctx, tour);
  }

  private async visible(ctx: AccessContext, tour: TourId): Promise<{ steps: TourStepDef[]; rows: Map<string, TourStepSetting> }> {
    // The administration tour exists only for who may switch admin mode on; for everyone else it is not there.
    if (tour === 'admin' && !ctx.has(CorePermission.AdminModeUse)) throw new NotFoundError('Tour');
    const rows = new Map((await this.repo.settings()).map((r) => [r.stepKey, r]));
    const hidden = new Set<string>(await this.pages.hiddenFor(ctx));
    const order = new Map([...rows].map(([key, r]) => [key, r.sortOrder]));
    const steps = sortedSteps(tour, order).filter((s) => this.mayShow(ctx, hidden, s, rows.get(s.key)));
    return { steps, rows };
  }

  private mayShow(ctx: AccessContext, hidden: ReadonlySet<string>, step: TourStepDef, row: TourStepSetting | undefined): boolean {
    if (row && !row.enabled) return false;
    if (step.permission && !ctx.has(step.permission)) return false;
    return !(step.page && hidden.has(step.page));
  }
}

