import type { Paginated, UsersQuery } from '@arweqah-platform/shared';
import type { ScopeFilter } from '../../../core/access/domain/access-context';
import type { User } from './user.entity';

export abstract class UserRepository {
  abstract findById(id: string): Promise<User | null>;
  abstract search(query: UsersQuery, scope: ScopeFilter): Promise<Paginated<User>>;
  abstract save(user: User): Promise<User>;
}
