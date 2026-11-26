import { Controller, Get, Param, Post, Res, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_CEILING_BYTES, type FileDto } from '@arweqah-platform/shared';
import { SecuritySettingsService } from '../../auth/application/security-settings.service';
import { CurrentUser } from '../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../common/presentation/request-context';
import { IdParam } from '../../../common/presentation/zod-query';
import { FilesService, toFileDto } from '../application/files.service';
import { sendPreviewStream } from './send-file';

/** security: self-scoped. Any signed-in user, but every read goes through getOwned(id, user.id): only the owner's files. */
@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(
    private readonly files: FilesService,
    private readonly settings: SecuritySettingsService,
  ) {}

  @Post()
  // The transport takes up to the ceiling; the size the administrator set (Settings → Security → Attachments) is checked right after, so it can change without a restart.
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_CEILING_BYTES, files: 1 } }))
  async upload(@CurrentUser() user: SessionUser, @UploadedFile() file?: Express.Multer.File): Promise<FileDto> {
    if (!file) throw new BadRequestException('file is required');
    const maxBytes = (await this.settings.get('maxUploadMb')) * 1024 * 1024;
    return this.files.upload(user.id, { buffer: file.buffer, originalName: file.originalname, size: file.size }, { maxBytes, types: ALLOWED_UPLOAD_TYPES });
  }

  @Get(':id')
  async metadata(@Param() { id }: IdParam, @CurrentUser() user: SessionUser): Promise<FileDto> {
    return toFileDto(await this.files.getOwned(id, user.id));
  }

  /** The bytes of the uploader's own file for the preview window (images, PDF, Word, Excel, PowerPoint, CSV), so a file can be checked before the form is sent. */
  @Get(':id/preview')
  async preview(@Param() { id }: IdParam, @CurrentUser() user: SessionUser, @Res() res: Response): Promise<void> {
    const file = await this.files.getOwned(id, user.id);
    const stream = await this.files.preview(file);
    sendPreviewStream(res, file, stream);
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
