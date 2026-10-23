export interface UserGroupRecord {
  id: string;
  nameAr: string;
  nameEn: string;
  description: string | null;
  members: { id: string; name: string }[];
}

export interface UserGroupValues {
  nameAr: string;
  nameEn: string;
  description: string | null;
  userIds: string[];
}

export abstract class UserGroupRepository {
  abstract all(): Promise<UserGroupRecord[]>;
  abstract find(id: string): Promise<UserGroupRecord | null>;
  abstract insert(values: UserGroupValues): Promise<string>;
  abstract update(id: string, values: UserGroupValues): Promise<void>;
  abstract remove(id: string): Promise<void>;
  /** Of these ids, the ones that are real people. */
  abstract existingUsers(userIds: string[]): Promise<string[]>;
}
