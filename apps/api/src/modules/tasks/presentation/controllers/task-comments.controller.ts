import { CorePermission } from '@arweqah-platform/shared';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { MentionableDto, TaskConversationDto } from '@arweqah-platform/shared';
import { IdParam } from '../../../../common/presentation/zod-query';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { sendOpenedFile, sendPreviewStream } from '../../../../core/files/presentation/send-file';
import { TaskViewerFactory } from '../../application/policies/task-viewer';
import { TaskCommentService } from '../../application/services/task-comment.service';
import { CommentFileParam, CommentParam, CreateCommentBody, EditCommentBody, MentionablesQueryDto } from '../dtos/tasks.dtos';

/**
 * The conversation of a task. A route asks for the key of its action; the service then asks the company's matrix for the person's relations to
 * the task. Somebody who may not read the conversation gets "not found", and somebody who reads but may not do an action gets "forbidden".
 */
@ApiTags('tasks')
@Controller('tasks/:id/comments')
export class TaskCommentsController {
  constructor(
    private readonly comments: TaskCommentService,
    private readonly viewers: TaskViewerFactory,
  ) {}

  @Get()
  @RequirePermission(CorePermission.TasksCommentView)
  async conversation(@Access() ctx: AccessContext, @Param() { id }: IdParam): Promise<TaskConversationDto> {
    return this.comments.conversation(await this.viewers.of(ctx), id);
  }

  @Post()
  @RequirePermission(CorePermission.TasksCommentAdd)
  async add(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: CreateCommentBody): Promise<TaskConversationDto> {
    return this.comments.add(await this.viewers.of(ctx), id, body);
  }

  @Get('mentionables')
  @RequirePermission(CorePermission.TasksCommentMention)
  async mentionables(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Query() { search }: MentionablesQueryDto): Promise<MentionableDto[]> {
    return this.comments.mentionables(await this.viewers.of(ctx), id, search);
  }

  @Post(':commentId/replies')
  @RequirePermission(CorePermission.TasksCommentReply)
  async reply(@Access() ctx: AccessContext, @Param() { id, commentId }: CommentParam, @Body() body: CreateCommentBody): Promise<TaskConversationDto> {
    return this.comments.reply(await this.viewers.of(ctx), id, commentId, body);
  }

  @Patch(':commentId')
  @RequirePermission(CorePermission.TasksCommentEdit)
  async edit(@Access() ctx: AccessContext, @Param() { id, commentId }: CommentParam, @Body() body: EditCommentBody): Promise<TaskConversationDto> {
    return this.comments.edit(await this.viewers.of(ctx), id, commentId, body);
  }

  /** Deleting one's own comment and deleting anybody's have different keys; the route asks for the page key and the service the rest. */
  @Delete(':commentId')
  @RequirePermission(CorePermission.TasksCommentView)
  async remove(@Access() ctx: AccessContext, @Param() { id, commentId }: CommentParam): Promise<TaskConversationDto> {
    return this.comments.remove(await this.viewers.of(ctx), id, commentId);
  }

  @Get(':commentId/files/:fileId/preview')
  @RequirePermission(CorePermission.TasksCommentView)
  async previewFile(@Access() ctx: AccessContext, @Param() { id, commentId, fileId }: CommentFileParam, @Res() res: Response): Promise<void> {
    const { file, stream } = await this.comments.previewFile(await this.viewers.of(ctx), id, commentId, fileId);
    sendPreviewStream(res, file, stream);
  }

  @Get(':commentId/files/:fileId')
  @RequirePermission(CorePermission.TasksCommentView)
  async file(@Access() ctx: AccessContext, @Param() { id, commentId, fileId }: CommentFileParam, @Res() res: Response): Promise<void> {
    const { file, opened } = await this.comments.openFile(await this.viewers.of(ctx), id, commentId, fileId);
    sendOpenedFile(res, file, opened);
  }
}
