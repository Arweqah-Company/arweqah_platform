import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { CorePermission, emailLogQuerySchema, type EmailLogDto, type Paginated } from '@arweqah-platform/shared';
import { HiddenWithPage, RequireAdminMode, RequirePermission } from '../../access/presentation/require-permission.decorator';
import { EmailLogService } from '../application/email-log.service';

class EmailLogQueryDto extends createZodDto(emailLogQuerySchema) {}

@ApiTags('notifications')
@Controller('email-logs')
@RequireAdminMode()
@HiddenWithPage('email-log')
export class EmailLogController {
  constructor(private readonly logs: EmailLogService) {}

  @Get()
  @RequirePermission(CorePermission.EmailLogView)
  search(@Query() query: EmailLogQueryDto): Promise<Paginated<EmailLogDto>> {
    return this.logs.search(query);
  }
}
