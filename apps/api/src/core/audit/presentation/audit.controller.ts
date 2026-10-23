import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { auditQuerySchema, CorePermission, type AuditLogDto, type Paginated } from '@arweqah-platform/shared';
import { HiddenWithPage, RequireAdminMode, RequirePermission } from '../../access/presentation/require-permission.decorator';
import { AuditService } from '../application/audit.service';

class AuditQueryDto extends createZodDto(auditQuerySchema) {}

@ApiTags('audit')
@Controller('audit-logs')
@RequireAdminMode()
@HiddenWithPage('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequirePermission(CorePermission.AuditView)
  search(@Query() query: AuditQueryDto): Promise<Paginated<AuditLogDto>> {
    return this.audit.search(query);
  }
}
