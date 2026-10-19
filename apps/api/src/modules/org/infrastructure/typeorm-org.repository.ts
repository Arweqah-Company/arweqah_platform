import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository, type EntityTarget } from 'typeorm';
import { Branch, Department, Team } from '../domain/org.entities';
import { OrgRepository, type OrgUnitKind } from '../domain/org.repository';

const ENTITY: Record<OrgUnitKind, EntityTarget<Branch | Department | Team>> = {
  branch: Branch,
  department: Department,
  team: Team,
};

/** SQL counting what depends on a unit: child units plus users placed in it. */
const DEPENDENTS_SQL: Record<OrgUnitKind, string> = {
  branch: `SELECT (SELECT COUNT(*) FROM departments WHERE branch_id = $1 AND deleted_at IS NULL)
              + (SELECT COUNT(*) FROM user_placements WHERE branch_id = $1) AS n`,
  department: `SELECT (SELECT COUNT(*) FROM departments WHERE parent_id = $1 AND deleted_at IS NULL)
              + (SELECT COUNT(*) FROM teams WHERE department_id = $1 AND deleted_at IS NULL)
              + (SELECT COUNT(*) FROM user_placements WHERE department_id = $1) AS n`,
  team: `SELECT (SELECT COUNT(*) FROM user_placements WHERE team_id = $1) AS n`,
};

@Injectable()
export class TypeOrmOrgRepository extends OrgRepository {
  constructor(
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Department) private readonly departmentRepo: Repository<Department>,
    @InjectRepository(Team) private readonly teamRepo: Repository<Team>,
  ) {
    super();
  }

  branches(): Promise<Branch[]> {
    return this.branchRepo.find({ order: { nameEn: 'ASC' } });
  }

  departments(): Promise<Department[]> {
    return this.departmentRepo.find({ order: { nameEn: 'ASC' } });
  }

  teams(): Promise<Team[]> {
    return this.teamRepo.find({ order: { nameEn: 'ASC' } });
  }

  findBranch(id: string): Promise<Branch | null> {
    return this.branchRepo.findOne({ where: { id } });
  }

  findDepartment(id: string): Promise<Department | null> {
    return this.departmentRepo.findOne({ where: { id } });
  }

  findTeam(id: string): Promise<Team | null> {
    return this.teamRepo.findOne({ where: { id } });
  }

  async branchCodeTaken(code: string, exceptId?: string): Promise<boolean> {
    return this.branchRepo.exists({ where: { code, ...(exceptId ? { id: Not(exceptId) } : {}) } });
  }

  save<T extends Branch | Department | Team>(unit: T): Promise<T> {
    return this.branchRepo.manager.save(unit);
  }

  async softDelete(kind: OrgUnitKind, id: string): Promise<void> {
    await this.branchRepo.manager.softDelete(ENTITY[kind], id);
  }

  async dependents(kind: OrgUnitKind, id: string): Promise<number> {
    // Parameterized constant SQL; no user input is concatenated.
    const rows: { n: string }[] = await this.branchRepo.query(DEPENDENTS_SQL[kind], [id]);
    return Number(rows[0]?.n ?? 0);
  }
}
