import type { User } from '../../auth/domain/user.entity';

export abstract class ProfileRepository {
  abstract findUser(id: string): Promise<User | null>;
  /** The employee record of the user and its photo; both null when the account has no employee record. */
  abstract findEmployeePhoto(userId: string): Promise<{ employeeId: string | null; photoFileId: string | null }>;
}
