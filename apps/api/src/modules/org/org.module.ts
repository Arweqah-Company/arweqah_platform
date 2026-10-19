import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionCatalog } from '../../core/access/application/permission-catalog';
import { OrgService } from './application/org.service';
import { Branch, Department, Team } from './domain/org.entities';
import { ORG_PERMISSIONS } from './domain/org.permissions';
import { OrgRepository } from './domain/org.repository';
import { TypeOrmOrgRepository } from './infrastructure/typeorm-org.repository';
import { OrgController } from './presentation/org.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Branch, Department, Team])],
  controllers: [OrgController],
  providers: [OrgService, { provide: OrgRepository, useClass: TypeOrmOrgRepository }],
  exports: [OrgService],
})
export class OrgModule implements OnModuleInit {
  constructor(private readonly catalog: PermissionCatalog) {}

  onModuleInit(): void {
    this.catalog.register(ORG_PERMISSIONS);
  }
}
