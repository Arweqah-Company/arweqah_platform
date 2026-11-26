import type { User } from '../../auth/domain/user.entity';

export abstract class ProfileRepository {
  abstract findUser(id: string): Promise<User | null>;
  /** The employee record of the user and its photo; null when the account has none. */
  abstract findEmployeePhoto(userId: string): Promise<{ employeeId: string; photoFileId: string | null } | null>;
}
