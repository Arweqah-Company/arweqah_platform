import { Global, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AbilityFactory } from './application/ability.factory';
import { AutoRolesService } from './application/auto-roles.service';
import { AdminModeEligibility } from './application/admin-mode-eligibility';
import { AdminModeService } from './application/admin-mode.service';
import { AccessContextService } from './application/access-context.service';
import { PageVisibilityService } from './application/page-visibility.service';
import { ProfileService } from './application/profile.service';
import { PermissionCatalog } from './application/permission-catalog';
import { PermissionTargetsService } from './application/permission-targets.service';
import { RoleGroupsService } from './application/role-groups.service';
import { UserGroupsService } from './application/user-groups.service';
import { RolesService } from './application/roles.service';
import { UserAccessService } from './application/user-access.service';
import { ACCESS_PERMISSIONS } from './domain/access.permissions';
import { RoleRepository, UserAccessRepository } from './domain/access.repository';
import { PermissionTargetRepository } from './domain/permission-target.repository';
import { RoleGroupRepository } from './domain/role-group.repository';
import { UserGroupRepository } from './domain/user-group.repository';
import { TypeOrmPermissionTargetRepository } from './infrastructure/typeorm-permission-target.repository';
import { TypeOrmUserGroupRepository } from './infrastructure/typeorm-user-group.repository';
import { PermissionTargetsController } from './presentation/permission-targets.controller';
import { UserGroupsController } from './presentation/user-groups.controller';
import { TypeOrmRoleGroupRepository } from './infrastructure/typeorm-role-group.repository';
import { RoleGroupsController } from './presentation/role-groups.controller';
import { AdminModeRepository } from './domain/admin-mode.repository';
import { PageVisibilityRepository } from './domain/page-visibility.repository';
import { ProfileRepository } from './domain/profile.repository';
import { User } from '../auth/domain/user.entity';
import { Role, RolePermission } from './domain/role.entity';
import { UserRole } from './domain/user-role.entity';
import { TypeOrmAdminModeRepository } from './infrastructure/typeorm-admin-mode.repository';
import { TypeOrmPageVisibilityRepository } from './infrastructure/typeorm-page-visibility.repository';
import { TypeOrmProfileRepository } from './infrastructure/typeorm-profile.repository';
import { TypeOrmRoleRepository } from './infrastructure/typeorm-role.repository';
import { TypeOrmUserAccessRepository } from './infrastructure/typeorm-user-access.repository';
import { AdminModeController } from './presentation/admin-mode.controller';
import { MeController } from './presentation/me.controller';
import { PageVisibilityController } from './presentation/page-visibility.controller';
import { PermissionsGuard } from './presentation/permissions.guard';
import { RolesController } from './presentation/roles.controller';

/** Dynamic roles, scoped permissions and the guard that enforces them. */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Role, RolePermission, UserRole, User])],
  controllers: [RolesController, RoleGroupsController, UserGroupsController, PermissionTargetsController, MeController, AdminModeController, PageVisibilityController],
  providers: [
    PermissionCatalog,
    AccessContextService,
    AbilityFactory,
    RolesService,
    RoleGroupsService,
    UserGroupsService,
    PermissionTargetsService,
    UserAccessService,
    ProfileService,
    AdminModeService,
    AdminModeEligibility,
    PageVisibilityService,
    AutoRolesService,
    PermissionsGuard,
    { provide: AdminModeRepository, useClass: TypeOrmAdminModeRepository },
    { provide: RoleRepository, useClass: TypeOrmRoleRepository },
    { provide: RoleGroupRepository, useClass: TypeOrmRoleGroupRepository },
    { provide: UserGroupRepository, useClass: TypeOrmUserGroupRepository },
    { provide: PermissionTargetRepository, useClass: TypeOrmPermissionTargetRepository },
    { provide: PageVisibilityRepository, useClass: TypeOrmPageVisibilityRepository },
    { provide: ProfileRepository, useClass: TypeOrmProfileRepository },
    { provide: UserAccessRepository, useClass: TypeOrmUserAccessRepository },
  ],
  exports: [PermissionCatalog, RoleGroupsService, AutoRolesService, AccessContextService, AbilityFactory, PermissionsGuard, UserAccessService, AdminModeService, AdminModeEligibility],
})
export class AccessModule implements OnModuleInit {
  constructor(private readonly catalog: PermissionCatalog) {}

  onModuleInit(): void {
    this.catalog.register(ACCESS_PERMISSIONS);
  }
}
