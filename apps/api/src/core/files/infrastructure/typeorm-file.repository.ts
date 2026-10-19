import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeOrmBaseRepository } from '../../../common/infrastructure/typeorm-base.repository';
import { StoredFile } from '../domain/stored-file.entity';

@Injectable()
export class TypeOrmFileRepository extends TypeOrmBaseRepository<StoredFile> {
  constructor(@InjectRepository(StoredFile) repo: Repository<StoredFile>) {
    super(repo);
  }
}
