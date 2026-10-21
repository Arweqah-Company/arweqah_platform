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
}
