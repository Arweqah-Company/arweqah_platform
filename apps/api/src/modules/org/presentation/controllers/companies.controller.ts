import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission, type CompanyDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../../common/presentation/request-context';
import { IdParam } from '../../../../common/presentation/zod-query';
import { HiddenWithPage, RequireAdminMode, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { CompaniesService } from '../../application/services/companies.service';
import { CompanyBody } from '../dtos/company.dtos';


@ApiTags('companies')
@Controller('companies')
@RequireAdminMode()
@HiddenWithPage('companies')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  @RequirePermission(CorePermission.CompaniesView)
  list(): Promise<CompanyDto[]> {
    return this.companies.list();
  }

  @Post()
  @RequirePermission(CorePermission.CompaniesManage)
  create(@Body() body: CompanyBody, @CurrentUser() user: SessionUser): Promise<CompanyDto> {
    return this.companies.create(body, user.id);
  }

  @Put(':id')
  @RequirePermission(CorePermission.CompaniesManage)
  update(@Param() { id }: IdParam, @Body() body: CompanyBody, @CurrentUser() user: SessionUser): Promise<CompanyDto> {
    return this.companies.update(id, body, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission(CorePermission.CompaniesManage)
  async remove(@Param() { id }: IdParam, @CurrentUser() user: SessionUser): Promise<void> {
    await this.companies.remove(id, user.id);
  }
}
