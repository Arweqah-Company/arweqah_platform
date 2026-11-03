import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { auditQuerySchema, CorePermission, type AuditLogDto, type Paginated } from '@arweqah-platform/shared';
import { HiddenWithPage, RequireAdminMode, RequirePermission } from '../../access/presentation/require-permission.decorator';
import { AuditService } from '../application/audit.service';
import type { ChainCheck } from '../domain/audit-chain';

class AuditQueryDto extends createZodDto(auditQuerySchema) {}

@ApiTags('audit')
@Controller('audit-logs')
@RequireAdminMode()
@HiddenWithPage('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  /** Is the log untouched? The entries must chain: each one hashes to what it says and points at the one before. */
  @Get('verify')
  @RequirePermission(CorePermission.AuditVerify)
  verify(): Promise<ChainCheck> {
    return this.audit.verify();
  }

  @Get()
  @RequirePermission(CorePermission.AuditView)
  search(@Query() query: AuditQueryDto): Promise<Paginated<AuditLogDto>> {
    return this.audit.search(query);
  }
}
