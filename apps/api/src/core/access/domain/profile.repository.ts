import type { User } from '../../auth/domain/user.entity';

export abstract class ProfileRepository {
  abstract findUser(id: string): Promise<User | null>;
}
