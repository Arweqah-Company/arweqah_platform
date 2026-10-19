import { Global, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionCatalog } from '../access/application/permission-catalog';
import { AuditService } from './application/audit.service';
import { AuditLog } from './domain/audit-log.entity';
import { AuditLogRepository } from './domain/audit-log.repository';
import { AUDIT_PERMISSIONS } from './domain/audit.permissions';
import { TypeOrmAuditLogRepository } from './infrastructure/typeorm-audit-log.repository';
import { AuditController } from './presentation/audit.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditController],
  providers: [AuditService, { provide: AuditLogRepository, useClass: TypeOrmAuditLogRepository }],
  exports: [AuditService],
})
export class AuditModule implements OnModuleInit {
  constructor(private readonly catalog: PermissionCatalog) {}

  onModuleInit(): void {
    this.catalog.register(AUDIT_PERMISSIONS);
  }
}
