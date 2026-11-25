import { BadRequestException, Controller, Get, Param, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AGENT_IMAGE_MAX_BYTES, CorePermission, type FileDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../../common/presentation/request-context';
import type { AccessContext } from '../../../access/domain/access-context';
import { Access, RequirePermission } from '../../../access/presentation/require-permission.decorator';
import { sendOpenedFile, sendPreviewStream } from '../../../files/presentation/send-file';
import { AgentFilesService } from '../../application/services/agent-files.service';
import { AgentHidden } from '../agent-hidden.decorator';
import { AgentIdParam } from '../dtos/agent.dtos';

/** The pictures of the assistant chat (FR-180). Not in the assistant's own catalog: an upload is not something it can do. */
@ApiTags('agent')
@Controller('agent/files')
@AgentHidden()
export class AgentFilesController {
  constructor(private readonly pictures: AgentFilesService) {}

  /** security: the picture belongs to the uploader alone until it is sent; the key decides who may attach. */
  @Post()
  @RequirePermission(CorePermission.AgentAttachImage)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: AGENT_IMAGE_MAX_BYTES, files: 1 } }))
  upload(@Access() ctx: AccessContext, @CurrentUser() user: SessionUser, @UploadedFile() file?: Express.Multer.File): Promise<FileDto> {
    if (!file) throw new BadRequestException('file is required');
    return this.pictures.upload(ctx, user.id, { buffer: file.buffer, originalName: file.originalname, size: file.size });
  }

  /** security: only the owner of the conversation the picture came with; any other answers 404. */
  @Get(':id/preview')
  @RequirePermission(CorePermission.AgentView)
  async preview(@CurrentUser() user: SessionUser, @Param() { id }: AgentIdParam, @Res() res: Response): Promise<void> {
    const { file, stream } = await this.pictures.preview(user.id, id);
    sendPreviewStream(res, file, stream);
  }

  @Get(':id/content')
  @RequirePermission(CorePermission.AgentView)
  async content(@CurrentUser() user: SessionUser, @Param() { id }: AgentIdParam, @Res() res: Response): Promise<void> {
    const { file, opened } = await this.pictures.open(user.id, id);
    sendOpenedFile(res, file, opened);
  }
}
