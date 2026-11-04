import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission, type DirectoryEntryDto, type DirectoryProfileDto, type Paginated } from '@arweqah-platform/shared';
import { IdParam } from '../../../../common/presentation/zod-query';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, HiddenWithPage, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { DirectoryService } from '../../application/services/directory.service';
import { DirectoryQueryDto } from '../dtos/employee.dtos';

/** «My team»: the basics of the colleagues of the viewer's own unit, never the full record (FR-92). */
@ApiTags('directory')
@Controller('directory')
@HiddenWithPage('directory')
export class DirectoryController {
  constructor(private readonly directory: DirectoryService) {}

  @Get()
  @RequirePermission(CorePermission.DirectoryView)
  list(@Access() ctx: AccessContext, @Query() query: DirectoryQueryDto): Promise<Paginated<DirectoryEntryDto>> {
    return this.directory.list(ctx, query);
  }

  @Get(':id')
  @RequirePermission(CorePermission.DirectoryView)
  profile(@Access() ctx: AccessContext, @Param() { id }: IdParam): Promise<DirectoryProfileDto> {
    return this.directory.profile(ctx, id);
  }
}
