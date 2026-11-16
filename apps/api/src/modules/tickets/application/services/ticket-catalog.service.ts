import { Injectable } from '@nestjs/common';
import { riyadhToday, type CatalogDeskDto, type CatalogTypeDto, type PersonRefDto, type TicketCatalogDto } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { OrgDirectoryService } from '../../../org/application/services/org-directory.service';
import { TicketDeskRepository } from '../../domain/contracts/ticket-desk.repository';
import { TicketDirectory } from '../../domain/contracts/ticket-directory.port';
import { deskUnavailableReason } from '../../domain/rules/ticket-flags.rules';
import type { DeskRecord, DepartmentFacts, TypeRecord } from '../../domain/types/ticket.types';

/** What the "new ticket" form offers: the departments that receive tickets (a paused one is shown but disabled), their types and usual durations. */
@Injectable()
export class TicketCatalogService {
  constructor(
    private readonly desks: TicketDeskRepository,
    private readonly directory: TicketDirectory,
    private readonly org: OrgDirectoryService,
    private readonly clock: Clock,
  ) {}

  async catalog(): Promise<TicketCatalogDto> {
    const today = riyadhToday(this.clock.now());
    const departments = await this.directory.departments();
    const ids = departments.map((d) => d.orgNodeId);
    const [records, types, names] = await Promise.all([this.desks.findMany(ids), this.desks.typesOfDesks(ids), this.org.describeNodes(ids)]);
    const people = await this.directory.people(types.flatMap((t) => t.handlers.map((h) => h.id)));
    const active = await this.eligibleHandlers(types);
    const desks: CatalogDeskDto[] = [];
    for (const desk of records) {
      const department = departments.find((d) => d.orgNodeId === desk.orgNodeId) as DepartmentFacts;
      const entry = this.deskEntry({ desk, department, today, names: names.get(desk.orgNodeId), types: types.filter((t) => t.deskId === desk.orgNodeId), people, active });
      if (entry) desks.push(entry);
    }
    return { desks: desks.sort((a, b) => a.nameAr.localeCompare(b.nameAr, 'ar')), today };
  }

  /** Per type, its handlers who are still active employees of the desk or the units below it (the rule creation applies). */
  private async eligibleHandlers(types: TypeRecord[]): Promise<Map<string, Set<string>>> {
    const entries = await Promise.all(types.map(async (t) => [t.id, new Set(await this.directory.membersOf(t.deskId, t.handlers.map((h) => h.id)))] as const));
    return new Map(entries);
  }

  /** Null when the desk should not be listed at all (stopped, or nothing to choose). */
  private deskEntry(i: { desk: DeskRecord; department: DepartmentFacts; today: string; names: { nameAr: string; nameEn: string } | undefined; types: TypeRecord[]; people: Map<string, PersonRefDto>; active: Map<string, Set<string>> }): CatalogDeskDto | null {
    const reason = deskUnavailableReason({ receptionStatus: i.desk.receptionStatus, startDate: i.department.startDate, hasManager: !!i.department.managerUserId }, i.today);
    if (reason === 'stopped') return null;
    const types = i.types.filter((t) => t.isActive && (i.desk.acceptsPersonal || !t.isPersonal)).map((t) => this.typeEntry(t, i));
    if (!types.length) return null;
    return {
      deskId: i.desk.orgNodeId,
      nameAr: i.names?.nameAr ?? '',
      nameEn: i.names?.nameEn ?? '',
      descriptionAr: i.desk.descriptionAr,
      descriptionEn: i.desk.descriptionEn,
      unavailableReason: reason,
      minLeadDays: i.desk.minLeadDays,
      types,
    };
  }

  private typeEntry(t: TypeRecord, i: { desk: DeskRecord; people: Map<string, PersonRefDto>; active: Map<string, Set<string>> }): CatalogTypeDto {
    const handlers = t.handlers.filter((h) => i.active.get(t.id)?.has(h.id)).flatMap((h) => i.people.get(h.id) ?? []);
    return {
      id: t.id,
      nameAr: t.nameAr,
      nameEn: t.nameEn,
      descriptionAr: t.descriptionAr,
      descriptionEn: t.descriptionEn,
      isPersonal: t.isPersonal,
      dueDays: t.dueDays ?? i.desk.defaultDueDays,
      instructionsAr: t.instructionsAr,
      instructionsEn: t.instructionsEn,
      handlers,
      available: !t.isPersonal || handlers.length > 0,
    };
  }
}
