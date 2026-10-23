import { Injectable } from '@nestjs/common';
import { CorePermission, FIGURES_WINDOW_DAYS, riyadhToday, type TicketFiguresDeskDto, type TicketFiguresDto } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { OrgDirectoryService } from '../../../org/application/services/org-directory.service';
import { TicketDeskRepository } from '../../domain/contracts/ticket-desk.repository';
import { TicketDirectory } from '../../domain/contracts/ticket-directory.port';
import { TicketFiguresRepository } from '../../domain/contracts/ticket-figures.repository';
import { DeskNotFoundError } from '../../domain/errors/ticket.errors';
import { TicketTransformer } from '../transformers/ticket.transformer';

const DAY_MS = 86_400_000;

/**
 * The figures page: the last 30 days, by department. A desk manager sees their departments, a platform manager every
 * department that has been set up. Counts include personal tickets; lists never do (the manager does not see those).
 */
@Injectable()
export class TicketFiguresService {
  constructor(
    private readonly figures: TicketFiguresRepository,
    private readonly desks: TicketDeskRepository,
    private readonly directory: TicketDirectory,
    private readonly org: OrgDirectoryService,
    private readonly transformer: TicketTransformer,
    private readonly clock: Clock,
  ) {}

  async figuresFor(ctx: AccessContext, deskId?: string): Promise<TicketFiguresDto> {
    const departments = ctx.has(CorePermission.TicketsAdminister) ? await this.directory.departments() : await this.managed(ctx.userId);
    const wanted = deskId ? departments.filter((d) => d.orgNodeId === deskId) : departments;
    if (deskId && !wanted.length) throw new DeskNotFoundError();
    const configured = new Set((await this.desks.findMany(wanted.map((d) => d.orgNodeId))).map((d) => d.orgNodeId));
    const ids = wanted.map((d) => d.orgNodeId).filter((id) => configured.has(id));
    const names = await this.org.describeNodes(ids);
    const result = await Promise.all(ids.map((id) => this.deskFigures(id, names.get(id))));
    return { windowDays: FIGURES_WINDOW_DAYS, desks: result.sort((a, b) => a.nameAr.localeCompare(b.nameAr, 'ar')) };
  }

  private async managed(userId: string) {
    const ids = await this.directory.managedDepartmentIds(userId);
    return ids.length ? this.directory.departments(ids) : [];
  }

  private async deskFigures(deskId: string, names: { nameAr: string; nameEn: string; pathAr: string; pathEn: string } | undefined): Promise<TicketFiguresDeskDto> {
    const now = this.clock.now();
    const [rows, attention] = await Promise.all([this.figures.deskFigures(deskId, new Date(now.getTime() - FIGURES_WINDOW_DAYS * DAY_MS)), this.figures.needsAttention(deskId, riyadhToday(now), now)]);
    return { deskId, nameAr: names?.nameAr ?? '', nameEn: names?.nameEn ?? '', ...rows, needsAttention: attention.map((r) => this.transformer.toListItem(r, names, now)) };
  }
}
