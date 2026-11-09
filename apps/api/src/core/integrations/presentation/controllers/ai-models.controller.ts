import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission, type AiModelsDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../../common/presentation/request-context';
import { HiddenWithPage, RequireAdminMode, RequirePermission } from '../../../access/presentation/require-permission.decorator';
import { AiModelsService } from '../../application/services/ai-models.service';
import { TestProviderDto } from '../dtos/integrations.dtos';

/**
 * The models an AI service offers to a key (for the pick list of the AI settings form), under `/api/integrations/ai`.
 *
 *   POST   /:providerKey/models   AiModelsDto   integrations.ai_test: the data in the form (the saved data fills the rest); `ok: false` with the service's words when it cannot be asked
 */
@ApiTags('integrations')
@Controller('integrations/ai')
@RequireAdminMode()
@HiddenWithPage('ai-settings')
export class AiModelsController {
  constructor(private readonly models: AiModelsService) {}

  @Post(':providerKey/models')
  @HttpCode(200)
  @RequirePermission(CorePermission.IntegrationsAiTest)
  list(@Param('providerKey') providerKey: string, @Body() body: TestProviderDto, @CurrentUser() user: SessionUser): Promise<AiModelsDto> {
    return this.models.list(providerKey, body, user.id);
  }
}
