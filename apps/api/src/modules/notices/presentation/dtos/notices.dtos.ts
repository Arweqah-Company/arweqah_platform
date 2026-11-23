import { createZodDto } from 'nestjs-zod';
import {
  addNoticeWriterSchema,
  createNoticeChannelSchema,
  createNoticeSchema,
  noticeAcknowledgementsQuerySchema,
  noticeActionSchema,
  noticeApprovalsQuerySchema,
  noticeAttachmentParamSchema,
  noticeAudienceCountSchema,
  noticeAudienceOptionsQuerySchema,
  noticeCandidatesQuerySchema,
  noticeChannelCodeParamSchema,
  noticeChannelUnitsQuerySchema,
  noticeManageQuerySchema,
  noticeMineQuerySchema,
  noticeSettingsSchema,
  noticeWriterParamSchema,
  noticeWritersQuerySchema,
  rejectNoticeSchema,
  renameNoticeChannelSchema,
  updateNoticeSchema,
} from '@arweqah-platform/shared';

export class CreateNoticeBody extends createZodDto(createNoticeSchema) {}
export class UpdateNoticeBody extends createZodDto(updateNoticeSchema) {}
export class NoticeActionBody extends createZodDto(noticeActionSchema) {}
export class RejectNoticeBody extends createZodDto(rejectNoticeSchema) {}
export class NoticeAudienceOptionsQueryDto extends createZodDto(noticeAudienceOptionsQuerySchema) {}
export class NoticeAudienceCountBody extends createZodDto(noticeAudienceCountSchema) {}
export class NoticeMineQueryDto extends createZodDto(noticeMineQuerySchema) {}
export class NoticeManageQueryDto extends createZodDto(noticeManageQuerySchema) {}
export class NoticeApprovalsQueryDto extends createZodDto(noticeApprovalsQuerySchema) {}
export class NoticeAcknowledgementsQueryDto extends createZodDto(noticeAcknowledgementsQuerySchema) {}
export class NoticeCandidatesQueryDto extends createZodDto(noticeCandidatesQuerySchema) {}
export class NoticeWritersQueryDto extends createZodDto(noticeWritersQuerySchema) {}
export class AddNoticeWriterBody extends createZodDto(addNoticeWriterSchema) {}
export class NoticeSettingsBody extends createZodDto(noticeSettingsSchema) {}
export class ChannelCodeParam extends createZodDto(noticeChannelCodeParamSchema) {}
export class WriterParam extends createZodDto(noticeWriterParamSchema) {}
export class NoticeAttachmentParam extends createZodDto(noticeAttachmentParamSchema) {}
export class CreateNoticeChannelBody extends createZodDto(createNoticeChannelSchema) {}
export class RenameNoticeChannelBody extends createZodDto(renameNoticeChannelSchema) {}
export class NoticeChannelUnitsQueryDto extends createZodDto(noticeChannelUnitsQuerySchema) {}
