import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { CorePermission, testTemplateInputSchema } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../common/presentation/request-context';
import { HiddenWithPage, RequireAdminMode, RequirePermission } from '../../access/presentation/require-permission.decorator';
import { TemplateTestMailService } from '../application/template-test-mail.service';

class TestTemplateDto extends createZodDto(testTemplateInputSchema) {}

/** The test message of an e-mail template: it sends mail, so it lives with the e-mail code and not with the template editor. */
@ApiTags('templates')
@Controller('templates/email')
@RequireAdminMode()
@HiddenWithPage('email-templates')
export class TemplateTestController {
  constructor(private readonly tests: TemplateTestMailService) {}

  @Post(':key/test')
  @HttpCode(200)
  @RequirePermission(CorePermission.TemplatesEmailTest)
  test(@Param('key') key: string, @Body() body: TestTemplateDto, @CurrentUser() user: SessionUser): Promise<{ sentTo: string }> {
    return this.tests.sendToSelf(key, body, user.id);
  }
}
