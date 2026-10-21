import { Controller, Get, Param, Post, Res, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { MAX_UPLOAD_BYTES, type FileDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../common/presentation/request-context';
import { IdParam } from '../../../common/presentation/zod-query';
import { FilesService, toFileDto } from '../application/files.service';

/** security: self-scoped. Any signed-in user, but every read goes through getOwned(id, user.id): only the owner's files. */
@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  upload(@CurrentUser() user: SessionUser, @UploadedFile() file?: Express.Multer.File): Promise<FileDto> {
    if (!file) throw new BadRequestException('file is required');
    return this.files.upload(user.id, { buffer: file.buffer, originalName: file.originalname, size: file.size });
  }

  @Get(':id')
  async metadata(@Param() { id }: IdParam, @CurrentUser() user: SessionUser): Promise<FileDto> {
    return toFileDto(await this.files.getOwned(id, user.id));
  }

  @Get(':id/content')
  async content(@Param() { id }: IdParam, @CurrentUser() user: SessionUser, @Res() res: Response): Promise<void> {
    const file = await this.files.getOwned(id, user.id);
    const opened = await this.files.open(file);
    if ('url' in opened) return res.redirect(opened.url);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
    opened.stream.pipe(res);
  }
}
