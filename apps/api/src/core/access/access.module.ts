import { Global, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AbilityFactory } from './application/ability.factory';
import { AccessContextService } from './application/access-context.service';
import { PermissionCatalog } from './application/permission-catalog';
import { RolesService } from './application/roles.service';
import { UserAccessService } from './application/user-access.service';
import { ACCESS_PERMISSIONS } from './domain/access.permissions';
import { RoleRepository, UserAccessRepository } from './domain/access.repository';
import { Role, RolePermission } from './domain/role.entity';
import { UserPlacement } from './domain/user-placement.entity';
import { UserRole } from './domain/user-role.entity';
import { TypeOrmRoleRepository } from './infrastructure/typeorm-role.repository';
import { TypeOrmUserAccessRepository } from './infrastructure/typeorm-user-access.repository';
import { PermissionsGuard } from './presentation/permissions.guard';
import { RolesController } from './presentation/roles.controller';

/** Dynamic roles, scoped permissions and the guard that enforces them. */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Role, RolePermission, UserRole, UserPlacement])],
  controllers: [RolesController],
  providers: [
    PermissionCatalog,
    AccessContextService,
    AbilityFactory,
    RolesService,
    UserAccessService,
    PermissionsGuard,
    { provide: RoleRepository, useClass: TypeOrmRoleRepository },
    { provide: UserAccessRepository, useClass: TypeOrmUserAccessRepository },
  ],
  exports: [PermissionCatalog, AccessContextService, AbilityFactory, PermissionsGuard, UserAccessService],
})
export class AccessModule implements OnModuleInit {
  constructor(private readonly catalog: PermissionCatalog) {}

  onModuleInit(): void {
    this.catalog.register(ACCESS_PERMISSIONS);
  }
}
