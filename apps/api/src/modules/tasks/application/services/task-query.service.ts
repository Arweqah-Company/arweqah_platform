import { Injectable } from '@nestjs/common';
import { CorePermission as P, MATRIX_QUADRANTS, riyadhToday, type MatrixQuadrant, type TaskListItemDto, type TaskMatrixDto, type TaskMatrixQuery, type TasksPageDto, type TasksQuery, type TeamTasksQuery } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { ForbiddenError } from '../../../../common/domain/domain-error';
import { TaskRepository } from '../../domain/contracts/task.repository';
import type { PolicyRecord, TaskListFilters, TaskViewer } from '../../domain/types/task.types';
import { TaskTransformer } from '../transformers/task.transformer';
import { TaskPolicyService } from './task-policy.service';

const MATRIX_LIMIT = 300;

/** The lists: my tasks (three tabs), my team's tasks, and the matrix. Visibility is decided in the query by relation and scope. */
@Injectable()
export class TaskQueryService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly transformer: TaskTransformer,
    private readonly policies: TaskPolicyService,
    private readonly clock: Clock,
  ) {}

  async list(viewer: TaskViewer, query: TasksQuery): Promise<TasksPageDto> {
    this.assertArchiveAllowed(viewer, query.archived);
    return this.page(viewer, { ...query, tab: query.tab });
  }

  async team(viewer: TaskViewer, query: TeamTasksQuery): Promise<TasksPageDto> {
    this.assertArchiveAllowed(viewer, query.archived);
    return this.page(viewer, { ...query, tab: 'team', teamKey: P.TasksTeamView });
  }

  async matrix(viewer: TaskViewer, query: TaskMatrixQuery): Promise<TaskMatrixDto> {
    const team = query.scope === 'team';
    const reach = viewer.scopes[P.TasksMatrixView];
    if (team && (!reach || reach === 'own')) throw new ForbiddenError();
    const { policy, base } = await this.base(viewer);
    const rows = await this.tasks.listOpen({ ...base, tab: team ? 'team' : 'assigned', teamKey: P.TasksMatrixView, reach: 'all', sort: 'dueDate', dir: 'asc' }, MATRIX_LIMIT);
    const items = rows.map((r) => this.transformer.toListItem(r, policy, base.today, base.now));
    return { quadrants: MATRIX_QUADRANTS.map((key) => this.quadrant(key, items)) };
  }

  private async page(viewer: TaskViewer, query: Omit<TaskListFilters, 'viewer' | 'today' | 'now' | 'staleDays'>): Promise<TasksPageDto> {
    const { policy, base } = await this.base(viewer);
    const page = await this.tasks.list({ ...base, ...query });
    return { ...page, items: page.items.map((r) => this.transformer.toListItem(r, policy, base.today, base.now)) };
  }

  private async base(viewer: TaskViewer): Promise<{ policy: PolicyRecord; base: Pick<TaskListFilters, 'viewer' | 'today' | 'now' | 'staleDays'> }> {
    const policy = await this.policies.forCompany(viewer.companyId);
    const now = this.clock.now();
    return { policy, base: { viewer, today: riyadhToday(now), now, staleDays: policy.staleDays } };
  }

  private assertArchiveAllowed(viewer: TaskViewer, archived: boolean | undefined): void {
    if (archived && !viewer.scopes[P.TasksArchiveView]) throw new ForbiddenError();
  }

  private quadrant(key: MatrixQuadrant, items: TaskListItemDto[]): TaskMatrixDto['quadrants'][number] {
    const important = key.startsWith('important');
    const urgent = !key.endsWith('not_urgent');
    const inside = items.filter((t) => (t.priority === 'high') === important && t.flags.urgent === urgent);
    return { key, total: inside.length, items: inside };
  }
}
