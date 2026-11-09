import { Body, Controller, Get, HttpCode, Param, Post, Put, type Type } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { IntegrationCatalogDto, IntegrationKind, ProviderDto, TestResultDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../../common/presentation/request-context';
import { HiddenWithPage, RequireAdminMode, RequirePermission } from '../../../access/presentation/require-permission.decorator';
import { IntegrationProvidersService } from '../../application/services/integration-providers.service';
import { SaveProviderDto, TestProviderDto } from '../dtos/integrations.dtos';

interface Keys {
  view: string;
  edit: string;
  test: string;
  activate: string;
}

/**
 * One controller per kind of provider, built from the same code: the routes are identical and only the path, the page
 * that can hide them and the four permission keys differ (translation and e-mail are separate pages with separate keys).
 */
export function integrationsController(kind: IntegrationKind, page: 'translation-settings' | 'email-settings' | 'captcha-settings' | 'ai-settings', keys: Keys): Type<unknown> {
  @ApiTags('integrations')
  @Controller(`integrations/${kind}`)
  @RequireAdminMode()
  @HiddenWithPage(page)
  class IntegrationsController {
    constructor(private readonly providers: IntegrationProvidersService) {}

    @Get()
    @RequirePermission(keys.view)
    catalog(): Promise<IntegrationCatalogDto> {
      return this.providers.catalog(kind);
    }

    @Put(':providerKey')
    @RequirePermission(keys.edit)
    save(@Param('providerKey') providerKey: string, @Body() body: SaveProviderDto, @CurrentUser() user: SessionUser): Promise<ProviderDto> {
      return this.providers.save(kind, providerKey, body, user.id);
    }

    @Post(':providerKey/test')
    @HttpCode(200)
    @RequirePermission(keys.test)
    test(@Param('providerKey') providerKey: string, @Body() body: TestProviderDto, @CurrentUser() user: SessionUser): Promise<TestResultDto> {
      return this.providers.test(kind, providerKey, body, user.id);
    }

    @Post(':providerKey/activate')
    @HttpCode(200)
    @RequirePermission(keys.activate)
    activate(@Param('providerKey') providerKey: string, @CurrentUser() user: SessionUser): Promise<IntegrationCatalogDto> {
      return this.providers.activate(kind, providerKey, user.id);
    }

    @Post('deactivate')
    @HttpCode(200)
    @RequirePermission(keys.activate)
    deactivate(@CurrentUser() user: SessionUser): Promise<IntegrationCatalogDto> {
      return this.providers.deactivate(kind, user.id);
    }
  }
  Object.defineProperty(IntegrationsController, 'name', { value: `${kind[0]!.toUpperCase()}${kind.slice(1)}ProvidersController` });
  return IntegrationsController;
}
