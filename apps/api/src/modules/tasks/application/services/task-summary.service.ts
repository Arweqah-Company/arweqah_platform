import { Injectable } from '@nestjs/common';
import { CorePermission as P, riyadhToday, type TaskStatus, type TaskSummaryDto } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { TaskSummaryRepository } from '../../domain/contracts/task-summary.repository';
import { TaskRepository } from '../../domain/contracts/task.repository';
import type { TaskViewer } from '../../domain/types/task.types';
import { TaskTransformer } from '../transformers/task.transformer';
import { TaskPolicyService } from './task-policy.service';

const SOON_DAYS = 7;
const CURRENT = 5;

/** The numbers and the short list of the home page: only what the person may see, counted by the database. */
@Injectable()
export class TaskSummaryService {
  constructor(
    private readonly summaries: TaskSummaryRepository,
    private readonly tasks: TaskRepository,
    private readonly transformer: TaskTransformer,
    private readonly policies: TaskPolicyService,
    private readonly clock: Clock,
  ) {}

  async summary(viewer: TaskViewer): Promise<TaskSummaryDto> {
    const now = this.clock.now();
    const today = riyadhToday(now);
    const policy = await this.policies.forCompany(viewer.companyId);
    const [mine, byStatus, waiting, current, team] = await Promise.all([
      this.summaries.mine(viewer.userId, today, now, SOON_DAYS),
      this.summaries.byStatus(viewer.userId),
      this.summaries.waiting(viewer.userId),
      this.tasks.listOpen({ viewer, tab: 'assigned', sort: 'dueDate', dir: 'asc', today, now, staleDays: policy.staleDays }, CURRENT),
      this.teamNumbers(viewer, { today, now, staleDays: policy.staleDays }),
    ]);
    return {
      open: mine.open,
      overdue: mine.overdue,
      dueSoon: mine.dueSoon,
      doneRecently: mine.doneRecently,
      onTimeRate: mine.doneRecently === 0 ? null : Math.round((mine.doneOnTime / mine.doneRecently) * 100),
      awaitingMyReview: waiting.review,
      awaitingMyApproval: waiting.approval,
      byStatus: byStatus as Partial<Record<TaskStatus, number>>,
      current: current.map((r) => this.transformer.toListItem(r, policy, today, now)),
      team,
    };
  }

  /** Numbers about the team only for people whose team key reaches beyond themselves. */
  private async teamNumbers(viewer: TaskViewer, input: { today: string; now: Date; staleDays: number }): Promise<TaskSummaryDto['team']> {
    const scope = viewer.scopes[P.TasksTeamView];
    return scope && scope !== 'own' ? this.summaries.team(viewer, scope, input) : null;
  }
}
