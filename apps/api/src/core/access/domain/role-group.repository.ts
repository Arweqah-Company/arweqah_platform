export interface RoleGroupRecord {
  id: string;
  nameAr: string;
  nameEn: string;
  description: string | null;
  roleIds: string[];
  usersCount: number;
}

export interface RoleGroupValues {
  nameAr: string;
  nameEn: string;
  description: string | null;
  roleIds: string[];
}

export abstract class RoleGroupRepository {
  abstract all(): Promise<RoleGroupRecord[]>;
  abstract find(id: string): Promise<RoleGroupRecord | null>;
  abstract insert(values: RoleGroupValues): Promise<string>;
  abstract update(id: string, values: RoleGroupValues): Promise<void>;
  abstract remove(id: string): Promise<void>;
}
