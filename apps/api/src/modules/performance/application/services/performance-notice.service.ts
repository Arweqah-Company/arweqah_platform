import { Injectable } from '@nestjs/common';
import { CorePermission, type CycleDateKey, type EvaluationNoticeDto, type EvaluationNoticesDto, type NoticeKind } from '@arweqah-platform/shared';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { PerformanceCycleRepository, type CycleRow } from '../../domain/contracts/performance-cycle.repository';
import { PerformanceSelfService } from './performance-self.service';
import { PerformanceTeamService } from './performance-team.service';

/** Where each task of the bar is worked from and which date of the cycle is its deadline (plan §15.2). */
const TASKS: Record<NoticeKind, { path: string; date: CycleDateKey }> = {
  self: { path: '/career-profile', date: 'self_deadline' },
  team: { path: '/performance-team', date: 'final' },
  calibrate: { path: '/performance-calibration', date: 'calibration' },
  approve: { path: '/performance-calibration', date: 'approval' },
};

/** The evaluation tasks open for the signed-in person right now, each with its deadline: the bar under the header. */
@Injectable()
export class PerformanceNoticeService {
  constructor(
    private readonly cycles: PerformanceCycleRepository,
    private readonly self: PerformanceSelfService,
    private readonly team: PerformanceTeamService,
  ) {}

  async mine(ctx: AccessContext): Promise<EvaluationNoticesDto> {
    const cycle = await this.cycles.current();
    if (!cycle || cycle.stage === 'closed') return { items: [] };
    const holds = (key: string, stage: CycleRow['stage'], kind: NoticeKind) => cycle.stage === stage && !!ctx.filterFor(key) && kind;
    const kinds = [(await this.selfOpen(ctx, cycle)) && 'self', (await this.teamOpen(ctx, cycle)) && 'team', holds(CorePermission.PerformanceCalibrate, 'cal', 'calibrate'), holds(CorePermission.PerformanceApprove, 'appr', 'approve')].filter((k): k is NoticeKind => !!k);
    return { items: kinds.map((kind) => notice(kind, cycle)) };
  }

  private async selfOpen(ctx: AccessContext, cycle: CycleRow): Promise<boolean> {
    if (cycle.stage !== 'self' || !ctx.filterFor(CorePermission.PerformanceSelfEvaluate)) return false;
    const mine = (await this.self.mine(ctx)).evaluation;
    return !!mine && mine.editable && !mine.self.sentAt;
  }

  private async teamOpen(ctx: AccessContext, cycle: CycleRow): Promise<boolean> {
    if (cycle.stage !== 'mgr' || !ctx.filterFor(CorePermission.PerformanceTeamEvaluate) || !ctx.filterFor(CorePermission.PerformanceTeamView)) return false;
    return (await this.team.waitingCount(ctx)) > 0;
  }
}

function notice(kind: NoticeKind, cycle: CycleRow): EvaluationNoticeDto {
  const date = cycle.dates.find((d) => d.key === TASKS[kind].date);
  return { kind, path: TASKS[kind].path, due: date ? { from: date.from, to: date.to } : null };
}
