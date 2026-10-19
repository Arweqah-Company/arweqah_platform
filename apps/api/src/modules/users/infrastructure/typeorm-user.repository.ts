import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Paginated, UsersQuery } from '@arweqah-platform/shared';
import type { ScopeFilter } from '../../../core/access/domain/access-context';
import { applyScope } from '../../../core/access/infrastructure/scope-query';
import { User } from '../domain/user.entity';
import { UserRepository } from '../domain/user.repository';

@Injectable()
export class TypeOrmUserRepository extends UserRepository {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {
    super();
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  save(user: User): Promise<User> {
    return this.repo.save(user);
  }

  async search(query: UsersQuery, scope: ScopeFilter): Promise<Paginated<User>> {
    const qb = this.repo
      .createQueryBuilder('u')
      .leftJoin('user_placements', 'p', 'p.user_id = u.id')
      .orderBy('u.name', 'ASC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize);
    applyScope(qb, scope, { owner: 'u.id', team: 'p.team_id', department: 'p.department_id', branch: 'p.branch_id' });
    if (query.status) qb.andWhere('u.is_active = :active', { active: query.status === 'active' });
    if (query.search) {
      qb.andWhere('(u.name ILIKE :term OR u.email ILIKE :term)', { term: `%${escapeLike(query.search)}%` });
    }
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page: query.page, pageSize: query.pageSize };
  }
}

/** Search text is matched literally, never as a LIKE pattern. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}
