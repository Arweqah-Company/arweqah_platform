import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { AGENT_AUDIO_MAX_BYTES, CorePermission, type AgentTranscriptDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../../common/presentation/request-context';
import { RequirePermission } from '../../../access/presentation/require-permission.decorator';
import { AgentVoiceService } from '../../application/services/agent-voice.service';
import { AgentHidden } from '../agent-hidden.decorator';

/** Speaking to the assistant (FR-181). Not in the assistant's own catalog. */
@ApiTags('agent')
@Controller('agent/transcribe')
@AgentHidden()
export class AgentVoiceController {
  constructor(private readonly voice: AgentVoiceService) {}

  /** security: the recording lives in memory for this request only (never stored); the key decides who may speak; the size is limited here and the length by its header. */
  @Post()
  @RequirePermission(CorePermission.AgentUseVoice)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: AGENT_AUDIO_MAX_BYTES, files: 1 } }))
  transcribe(@CurrentUser() user: SessionUser, @UploadedFile() file?: Express.Multer.File): Promise<AgentTranscriptDto> {
    if (!file) throw new BadRequestException('file is required');
    return this.voice.transcribe(user.id, file.buffer);
  }
}
