import { Injectable } from '@nestjs/common';
import { CorePermission, FIGURES_WINDOW_DAYS, riyadhToday, type FiguresDeskRef, type TicketFiguresBlockDto, type TicketFiguresDto } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { OrgDirectoryService } from '../../../org/application/services/org-directory.service';
import { TicketDirectory } from '../../domain/contracts/ticket-directory.port';
import { TicketFiguresRepository } from '../../domain/contracts/ticket-figures.repository';
import { DeskNotFoundError } from '../../domain/errors/ticket.errors';
import { TicketTransformer } from '../transformers/ticket.transformer';

const DAY_MS = 86_400_000;

/**
 * The figures page: the last 30 days, of one department or added up over every department the person may see (a desk
 * manager: theirs; a platform manager: all of the organization structure). Counts include personal tickets; lists never do (the manager does not see those).
 */
@Injectable()
export class TicketFiguresService {
  constructor(
    private readonly figures: TicketFiguresRepository,
    private readonly directory: TicketDirectory,
    private readonly org: OrgDirectoryService,
    private readonly transformer: TicketTransformer,
    private readonly clock: Clock,
  ) {}

  async figuresFor(ctx: AccessContext, deskId?: string): Promise<TicketFiguresDto> {
    const departments = ctx.has(CorePermission.TicketsAdminister) ? await this.directory.departments() : await this.managed(ctx.userId);
    const wanted = deskId ? departments.filter((d) => d.orgNodeId === deskId) : departments;
    if (deskId && !wanted.length) throw new DeskNotFoundError();
    // Every department of the organization structure the person may see, set up for tickets or not (an unset one counts zero).
    const names = await this.org.describeNodes(departments.map((d) => d.orgNodeId));
    const ids = wanted.map((d) => d.orgNodeId);
    const now = this.clock.now();
    const [rows, attention] = await Promise.all([this.figures.deskFigures(ids, new Date(now.getTime() - FIGURES_WINDOW_DAYS * DAY_MS)), this.figures.needsAttention(ids, riyadhToday(now), now)]);
    const ref = (id: string): FiguresDeskRef => ({ deskId: id, deskNameAr: names.get(id)?.nameAr ?? '', deskNameEn: names.get(id)?.nameEn ?? '' });
    const figures: TicketFiguresBlockDto = {
      ...rows,
      byType: rows.byType.map((r) => ({ ...r, ...ref(r.deskId) })),
      byAssignee: rows.byAssignee.map((r) => ({ ...r, ...ref(r.deskId) })),
      needsAttention: attention.map((r) => this.transformer.toListItem(r, names.get(r.deskId), now)),
    };
    const desks = departments.map((d) => ({ id: d.orgNodeId, nameAr: names.get(d.orgNodeId)?.nameAr ?? '', nameEn: names.get(d.orgNodeId)?.nameEn ?? '' }));
    return { windowDays: FIGURES_WINDOW_DAYS, desks: desks.sort((a, b) => a.nameAr.localeCompare(b.nameAr, 'ar')), scope: deskId ? 'desk' : 'all', figures };
  }

  private async managed(userId: string) {
    const ids = await this.directory.managedDepartmentIds(userId);
    return ids.length ? this.directory.departments(ids) : [];
  }
}
