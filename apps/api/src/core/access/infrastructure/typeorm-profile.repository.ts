import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../auth/domain/user.entity';
import { ProfileRepository } from '../domain/profile.repository';

@Injectable()
export class TypeOrmProfileRepository extends ProfileRepository {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {
    super();
  }

  findUser(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  async findEmployeePhoto(userId: string): Promise<{ employeeId: string; photoFileId: string | null } | null> {
    const row = await this.users.manager
      .createQueryBuilder()
      .select('e.id', 'employeeId')
      .addSelect('e.photo_file_id', 'photoFileId')
      .from('employees', 'e')
      .where('e.user_id = :userId AND e.deleted_at IS NULL', { userId })
      .getRawOne<{ employeeId: string; photoFileId: string | null }>();
    return row ?? null;
  }
}
