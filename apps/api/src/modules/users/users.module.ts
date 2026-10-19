import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionCatalog } from '../../core/access/application/permission-catalog';
import { OrgModule } from '../org/org.module';
import { UsersService } from './application/users.service';
import { User } from './domain/user.entity';
import { UserRepository } from './domain/user.repository';
import { USERS_PERMISSIONS } from './domain/users.permissions';
import { TypeOrmUserRepository } from './infrastructure/typeorm-user.repository';
import { UsersController } from './presentation/users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User]), OrgModule],
  controllers: [UsersController],
  providers: [UsersService, { provide: UserRepository, useClass: TypeOrmUserRepository }],
  exports: [UsersService],
})
export class UsersModule implements OnModuleInit {
  constructor(private readonly catalog: PermissionCatalog) {}

  onModuleInit(): void {
    this.catalog.register(USERS_PERMISSIONS);
  }
}
