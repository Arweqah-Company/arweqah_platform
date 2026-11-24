import { Injectable } from '@nestjs/common';
import type { Readable } from 'node:stream';
import { AGENT_IMAGE_MAX_BYTES, AGENT_IMAGE_TYPES, CorePermission, type AgentFileDto, type FileDto } from '@arweqah-platform/shared';
import { ForbiddenError, NotFoundError } from '../../../../common/domain/domain-error';
import type { AccessContext } from '../../../access/domain/access-context';
import { FilesService, type IncomingFile } from '../../../files/application/files.service';
import type { StoredFile } from '../../../files/domain/stored-file.entity';
import type { AiImage } from '../../../integrations/domain/contracts/ai-client';
import { AgentRepository } from '../../domain/contracts/agent.repository';
import { AgentAvailability } from './agent-availability';

const TYPES: readonly string[] = AGENT_IMAGE_TYPES;

/**
 * The pictures of the chat (FR-180): what an employee uploads before sending, the check that a picture sent with a message is theirs and still free,
 * who may read one (only the owner of the conversation it came with) and the bytes the AI service is shown.
 */
@Injectable()
export class AgentFilesService {
  constructor(
    private readonly files: FilesService,
    private readonly repo: AgentRepository,
    private readonly availability: AgentAvailability,
  ) {}

  /** Only an image of the allowed kinds and size is stored (the content is inspected, not the name); it belongs to the uploader alone until it is sent. */
  async upload(ctx: AccessContext, userId: string, file: IncomingFile): Promise<FileDto> {
    await this.availability.assertOn();
    this.assertMayAttach(ctx);
    return this.files.upload(userId, file, { maxBytes: AGENT_IMAGE_MAX_BYTES, types: TYPES });
  }

  /** Sending pictures needs the key; without pictures nothing is asked of it. */
  assertMayAttach(ctx: AccessContext): void {
    if (!ctx.has(CorePermission.AgentAttachImage)) throw new ForbiddenError();
  }

  /** The ids as they will be saved: each one a picture of the person that no message has taken yet (anything else answers «not found»). */
  async attachable(userId: string, fileIds: string[]): Promise<string[]> {
    const unique = [...new Set(fileIds)];
    for (const id of unique) {
      const file = await this.files.getOwned(id, userId);
      if (!TYPES.includes(file.contentType)) throw new NotFoundError('File', id);
    }
    if ((await this.repo.linkedFileIds(unique)).length) throw new NotFoundError('File');
    return unique;
  }

  /** A picture of the person's own conversations, or «not found». */
  async readable(userId: string, id: string): Promise<StoredFile> {
    if (!(await this.repo.canReadFile(id, userId))) throw new NotFoundError('File', id);
    return this.files.getGranted(id);
  }

  async preview(userId: string, id: string): Promise<{ file: StoredFile; stream: Readable }> {
    const file = await this.readable(userId, id);
    return { file, stream: await this.files.preview(file) };
  }

  async open(userId: string, id: string): Promise<{ file: StoredFile; opened: { url: string } | { stream: Readable } }> {
    const file = await this.readable(userId, id);
    return { file, opened: await this.files.open(file) };
  }

  /** The pictures as the AI service reads them. */
  async imagesOf(pictures: readonly AgentFileDto[]): Promise<AiImage[]> {
    const images: AiImage[] = [];
    for (const picture of pictures) {
      const file = await this.files.getGranted(picture.id);
      images.push({ mediaType: file.contentType as AiImage['mediaType'], data: (await this.files.readBytes(file)).toString('base64') });
    }
    return images;
  }
}
