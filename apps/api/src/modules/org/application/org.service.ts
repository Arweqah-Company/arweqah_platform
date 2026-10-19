import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type {
  OrgTreeDto,
  UpsertBranchInput,
  UpsertDepartmentInput,
  UpsertTeamInput,
} from '@arweqah-platform/shared';
import { NotFoundError } from '../../../common/domain/domain-error';
import { AUDIT_EVENT, type AuditEvent } from '../../../core/audit/application/audit.events';
import { BranchCodeTakenError, InvalidOrgHierarchyError, OrgUnitInUseError } from '../domain/errors';
import { Branch, Department, Team } from '../domain/org.entities';
import { OrgRepository, type OrgUnitKind } from '../domain/org.repository';
import { toBranchDto, toDepartmentDto, toTeamDto } from './org.mapper';

@Injectable()
export class OrgService {
  constructor(
    private readonly repo: OrgRepository,
    private readonly events: EventEmitter2,
  ) {}

  async tree(): Promise<OrgTreeDto> {
    const [branches, departments, teams] = await Promise.all([this.repo.branches(), this.repo.departments(), this.repo.teams()]);
    return {
      branches: branches.map((b) => ({
        ...toBranchDto(b),
        departments: departments
          .filter((d) => d.branchId === b.id)
          .map((d) => ({ ...toDepartmentDto(d), teams: teams.filter((t) => t.departmentId === d.id).map(toTeamDto) })),
      })),
    };
  }

  async saveBranch(input: UpsertBranchInput, actorId: string, id?: string): Promise<Branch> {
    if (await this.repo.branchCodeTaken(input.code, id)) throw new BranchCodeTakenError();
    const branch = id ? await this.must(this.repo.findBranch(id), 'Branch', id) : new Branch();
    Object.assign(branch, { ...input, city: input.city ?? null });
    return this.persist('branch', await this.repo.save(branch), actorId);
  }

  async saveDepartment(input: UpsertDepartmentInput, actorId: string, id?: string): Promise<Department> {
    await this.must(this.repo.findBranch(input.branchId), 'Branch', input.branchId);
    if (input.parentId) await this.assertValidParent(input.parentId, input.branchId, id);
    const department = id ? await this.must(this.repo.findDepartment(id), 'Department', id) : new Department();
    Object.assign(department, { ...input, parentId: input.parentId ?? null, headUserId: input.headUserId ?? null });
    return this.persist('department', await this.repo.save(department), actorId);
  }

  async saveTeam(input: UpsertTeamInput, actorId: string, id?: string): Promise<Team> {
    await this.must(this.repo.findDepartment(input.departmentId), 'Department', input.departmentId);
    const team = id ? await this.must(this.repo.findTeam(id), 'Team', id) : new Team();
    Object.assign(team, { ...input, leadUserId: input.leadUserId ?? null });
    return this.persist('team', await this.repo.save(team), actorId);
  }

  async remove(kind: OrgUnitKind, id: string, actorId: string): Promise<void> {
    await this.must(this.findUnit(kind, id), kind, id);
    if ((await this.repo.dependents(kind, id)) > 0) throw new OrgUnitInUseError();
    await this.repo.softDelete(kind, id);
    this.audit(actorId, `org.${kind}.deleted`, kind, id);
  }

  private findUnit(kind: OrgUnitKind, id: string): Promise<Branch | Department | Team | null> {
    if (kind === 'branch') return this.repo.findBranch(id);
    if (kind === 'department') return this.repo.findDepartment(id);
    return this.repo.findTeam(id);
  }

  /** A placement must be consistent: team inside department inside branch. */
  async assertPlacement(p: { branchId: string | null; departmentId: string | null; teamId: string | null }): Promise<void> {
    if (p.branchId) await this.must(this.repo.findBranch(p.branchId), 'Branch', p.branchId);
    if (p.departmentId) {
      const department = await this.must(this.repo.findDepartment(p.departmentId), 'Department', p.departmentId);
      if (department.branchId !== p.branchId) throw new InvalidOrgHierarchyError('Department is not in the selected branch');
    }
    if (p.teamId) {
      const team = await this.must(this.repo.findTeam(p.teamId), 'Team', p.teamId);
      if (team.departmentId !== p.departmentId) throw new InvalidOrgHierarchyError('Team is not in the selected department');
    }
  }

  /** Parent must be in the same branch and must not be the department itself or its descendant. */
  private async assertValidParent(parentId: string, branchId: string, selfId?: string): Promise<void> {
    const all = new Map((await this.repo.departments()).map((d) => [d.id, d]));
    const parent = all.get(parentId);
    if (!parent) throw new NotFoundError('Department', parentId);
    if (parent.branchId !== branchId) throw new InvalidOrgHierarchyError('Parent department must be in the same branch');
    for (let cursor: Department | undefined = parent; cursor; cursor = cursor.parentId ? all.get(cursor.parentId) : undefined) {
      if (cursor.id === selfId) throw new InvalidOrgHierarchyError('A department cannot be inside itself');
    }
  }

  private persist<T extends { id: string }>(kind: OrgUnitKind, unit: T, actorId: string): T {
    this.audit(actorId, `org.${kind}.saved`, kind, unit.id);
    return unit;
  }

  private audit(actorId: string, action: string, entityType: string, entityId: string): void {
    const event: AuditEvent = { actorId, action, entityType, entityId };
    this.events.emit(AUDIT_EVENT, event);
  }

  private async must<T>(promise: Promise<T | null>, entity: string, id: string): Promise<T> {
    const found = await promise;
    if (!found) throw new NotFoundError(entity, id);
    return found;
  }
}
