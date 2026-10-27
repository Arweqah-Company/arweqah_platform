import { Body, Controller, Get, HttpCode, Param, Post, Put, type Type } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { TemplateCatalogDto, TemplateDto, TemplateKind, TemplatePreviewDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../../common/presentation/request-context';
import { HiddenWithPage, RequireAdminMode, RequirePermission } from '../../../access/presentation/require-permission.decorator';
import { MessageTemplatesService } from '../../application/services/message-templates.service';
import { PreviewTemplateDto, RejectTemplateDto, SaveTemplateDto, TemplateSettingsDto } from '../dtos/templates.dtos';

interface Keys {
  view: string;
  edit: string;
  reset: string;
  approve: string;
  settings: string;
}

/** One controller per kind (e-mail, notification), built from the same code; only the path, the page that can hide it and the keys differ. */
export function templatesController(kind: TemplateKind, page: 'email-templates' | 'notification-templates', keys: Keys): Type<unknown> {
  @ApiTags('templates')
  @Controller(`templates/${kind}`)
  @RequireAdminMode()
  @HiddenWithPage(page)
  class TemplatesController {
    constructor(private readonly templates: MessageTemplatesService) {}

    @Get()
    @RequirePermission(keys.view)
    catalog(): Promise<TemplateCatalogDto> {
      return this.templates.catalog(kind);
    }

    @Put('settings')
    @RequirePermission(keys.settings)
    settings(@Body() body: TemplateSettingsDto, @CurrentUser() user: SessionUser): Promise<TemplateCatalogDto> {
      return this.templates.setRequireApproval(kind, body.requireApproval, user.id);
    }

    @Put(':key')
    @RequirePermission(keys.edit)
    save(@Param('key') key: string, @Body() body: SaveTemplateDto, @CurrentUser() user: SessionUser): Promise<TemplateDto> {
      return this.templates.save(kind, key, body, user.id);
    }

    @Post(':key/preview')
    @HttpCode(200)
    @RequirePermission(keys.view)
    preview(@Param('key') key: string, @Body() body: PreviewTemplateDto): TemplatePreviewDto {
      return this.templates.preview(kind, key, body);
    }

    @Post(':key/reset')
    @HttpCode(200)
    @RequirePermission(keys.reset)
    reset(@Param('key') key: string, @CurrentUser() user: SessionUser): Promise<TemplateDto> {
      return this.templates.reset(kind, key, user.id);
    }
  }
  Object.defineProperty(TemplatesController, 'name', { value: `${kind[0]!.toUpperCase()}${kind.slice(1)}TemplatesController` });
  return TemplatesController;
}

/** Approving or rejecting a pending change: its own controller on the same path, so the editing one stays small. */
export function templateApprovalController(kind: TemplateKind, page: 'email-templates' | 'notification-templates', approveKey: string): Type<unknown> {
  @ApiTags('templates')
  @Controller(`templates/${kind}`)
  @RequireAdminMode()
  @HiddenWithPage(page)
  class TemplateApprovalController {
    constructor(private readonly templates: MessageTemplatesService) {}

    @Post(':key/approve')
    @HttpCode(200)
    @RequirePermission(approveKey)
    approve(@Param('key') key: string, @CurrentUser() user: SessionUser): Promise<TemplateDto> {
      return this.templates.approve(kind, key, user.id);
    }

    @Post(':key/reject')
    @HttpCode(200)
    @RequirePermission(approveKey)
    reject(@Param('key') key: string, @Body() body: RejectTemplateDto, @CurrentUser() user: SessionUser): Promise<TemplateDto> {
      return this.templates.reject(kind, key, body.note, user.id);
    }
  }
  Object.defineProperty(TemplateApprovalController, 'name', { value: `${kind[0]!.toUpperCase()}${kind.slice(1)}TemplateApprovalController` });
  return TemplateApprovalController;
}
