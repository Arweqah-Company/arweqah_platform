import { Injectable } from '@nestjs/common';
import type { JobTitleOptionDto, OrgNodeOptionDto } from '@arweqah-platform/shared';
import { InvalidPlacementError } from '../../domain/errors/org.errors';
import type { CompanyView, NodeView } from '../../domain/types/org.types';
import { OrgRepository } from '../../domain/contracts/org.repository';

export interface NamedRef {
  id: string;
  nameAr: string;
  nameEn: string;
}

/**
 * The org module's public API for other modules (employees, lookups): validation of a placement
 * and read-only descriptions. Other modules never touch the org repository.
 */
@Injectable()
export class OrgDirectoryService {
  constructor(private readonly repo: OrgRepository) {}

  /** A person is placed in an active unit of their company whose level accepts employees, with one of its active job titles. */
  async assertPlacement(placement: { companyId: string; orgNodeId: string; jobTitleId: string }): Promise<void> {
    const node = await this.repo.node(placement.orgNodeId);
    const level = node ? await this.repo.level(node.levelId) : null;
    const title = await this.repo.title(placement.jobTitleId);
    const valid =
      node && level && title && node.companyId === placement.companyId && node.isActive && level.isAssignable && title.orgNodeId === node.id && title.isActive;
    if (!valid) throw new InvalidPlacementError('The unit and job title must belong to the selected company and accept employees');
  }

  async companyOptions(): Promise<CompanyView[]> {
    return (await this.repo.companies()).filter((c) => c.isActive);
  }

  async companyExists(id: string): Promise<boolean> {
    return !!(await this.repo.company(id));
  }

  async describeCompanies(ids: string[]): Promise<Map<string, NamedRef>> {
    const wanted = new Set(ids);
    return new Map((await this.repo.companies()).filter((c) => wanted.has(c.id)).map((c) => [c.id, { id: c.id, nameAr: c.nameAr, nameEn: c.nameEn }]));
  }

  async describeNodes(ids: string[]): Promise<Map<string, NamedRef & { pathAr: string; pathEn: string }>> {
    const [nodes, paths] = await Promise.all([this.repo.nodesByIds(ids), this.repo.pathsOf(ids)]);
    return new Map(
      nodes.map((n) => [n.id, { id: n.id, nameAr: n.nameAr, nameEn: n.nameEn, pathAr: paths.get(n.id)?.pathAr ?? n.nameAr, pathEn: paths.get(n.id)?.pathEn ?? n.nameEn }]),
    );
  }

  async describeTitles(ids: string[]): Promise<Map<string, NamedRef>> {
    return new Map((await this.repo.titlesByIds(ids)).map((t) => [t.id, { id: t.id, nameAr: t.nameAr, nameEn: t.nameEn }]));
  }

  /** Units that can take employees (assignable level, active, at least one active title), with their default manager. */
  async nodeOptions(companyId: string): Promise<OrgNodeOptionDto[]> {
    const [levels, nodes] = await Promise.all([this.repo.levels(companyId), this.repo.nodes(companyId)]);
    const assignable = new Set(levels.filter((l) => l.isAssignable).map((l) => l.id));
    const candidates = nodes.filter((n) => n.isActive && assignable.has(n.levelId));
    const titles = await this.repo.titlesOfNodes(candidates.map((n) => n.id));
    const withTitles = new Set(titles.filter((t) => t.isActive).map((t) => t.orgNodeId));
    const usable = candidates.filter((n) => withTitles.has(n.id));
    const paths = await this.repo.pathsOf(usable.map((n) => n.id));
    const byId = new Map(nodes.map((n) => [n.id, n]));
    return usable
      .map((n) => ({
        id: n.id,
        path: paths.get(n.id)?.pathAr ?? n.nameAr,
        pathAr: paths.get(n.id)?.pathAr ?? n.nameAr,
        pathEn: paths.get(n.id)?.pathEn ?? n.nameEn,
        nameAr: n.nameAr,
        nameEn: n.nameEn,
        defaultManagerId: defaultManager(n, byId),
      }))
      .sort((a, b) => a.pathAr.localeCompare(b.pathAr, 'ar'));
  }

  async titleOptions(nodeId: string): Promise<JobTitleOptionDto[]> {
    return (await this.repo.titlesOfNodes([nodeId])).filter((t) => t.isActive).map((t) => ({ id: t.id, name: t.nameAr, nameAr: t.nameAr, nameEn: t.nameEn }));
  }
}

/** The unit's own manager, else the nearest ancestor's. */
function defaultManager(node: NodeView, byId: Map<string, NodeView>): string | null {
  for (let cursor: NodeView | undefined = node; cursor; cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined) {
    if (cursor.managerId) return cursor.managerId;
  }
  return null;
}
