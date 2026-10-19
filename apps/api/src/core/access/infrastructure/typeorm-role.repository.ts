import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from '../domain/role.entity';
import { RoleRepository } from '../domain/access.repository';
import { UserRole } from '../domain/user-role.entity';

@Injectable()
export class TypeOrmRoleRepository extends RoleRepository {
  constructor(
    @InjectRepository(Role) private readonly repo: Repository<Role>,
    @InjectRepository(UserRole) private readonly userRoles: Repository<UserRole>,
  ) {
    super();
  }

  async findAll(): Promise<(Role & { usersCount: number })[]> {
    const roles = await this.repo.find({ order: { isSystem: 'DESC', nameEn: 'ASC' } });
    const counts = await this.userRoles
      .createQueryBuilder('ur')
      .select('ur.role_id', 'roleId')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('ur.role_id')
      .getRawMany<{ roleId: string; count: number }>();
    const byRole = new Map(counts.map((c) => [c.roleId, c.count]));
    return roles.map((r) => Object.assign(r, { usersCount: byRole.get(r.id) ?? 0 }));
  }

  findById(id: string): Promise<Role | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByIds(ids: string[]): Promise<Role[]> {
    return ids.length ? this.repo.find({ where: { id: In(ids) } }) : Promise.resolve([]);
  }

  save(role: Role): Promise<Role> {
    return this.repo.manager.transaction(async (m) => {
      // Replace the grant set atomically: cascade inserts new rows, stale ones are removed here.
      if (role.id) await m.delete('role_permissions', { roleId: role.id });
      return m.save(Role, role);
    });
  }

  async remove(role: Role): Promise<void> {
    await this.repo.remove(role);
  }
}
