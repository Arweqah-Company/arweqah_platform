import { BadRequestException, Controller, Delete, Get, HttpCode, Param, Put, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CorePermission, EMPLOYEE_PHOTO_MAX_BYTES, type EmployeeDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../../common/presentation/request-context';
import { IdParam } from '../../../../common/presentation/zod-query';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, HiddenWithPage, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { EmployeePhotoService } from '../../application/services/employee-photo.service';

const P = CorePermission;

/** The profile photo of an employee (FR-91): set and removed with `employees.photo_update`, read by whoever holds `directory.view` for their teammates, and by whoever reaches the record with `employees.view`. */
@ApiTags('employees')
@Controller('employees/:id/photo')
@HiddenWithPage('employees')
export class EmployeePhotoController {
  constructor(private readonly photos: EmployeePhotoService) {}

  @Put()
  @RequirePermission(P.EmployeesPhotoUpdate)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: EMPLOYEE_PHOTO_MAX_BYTES, files: 1 } }))
  set(@Access() ctx: AccessContext, @Param() { id }: IdParam, @CurrentUser() user: SessionUser, @UploadedFile() file?: Express.Multer.File): Promise<Pick<EmployeeDto, 'photoFileId'>> {
    if (!file) throw new BadRequestException('file is required');
    return this.photos.set(ctx, id, { buffer: file.buffer, originalName: file.originalname, size: file.size }, user.id);
  }

  @Delete()
  @HttpCode(204)
  @RequirePermission(P.EmployeesPhotoUpdate)
  clear(@Access() ctx: AccessContext, @Param() { id }: IdParam, @CurrentUser() user: SessionUser): Promise<void> {
    return this.photos.clear(ctx, id, user.id);
  }

  @Get()
  @RequirePermission(P.DirectoryView)
  async read(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Res() res: Response): Promise<void> {
    const file = await this.photos.fileOf(ctx, id);
    const opened = await this.photos.open(file);
    if ('url' in opened) return res.redirect(opened.url);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    opened.stream.pipe(res);
  }
}
