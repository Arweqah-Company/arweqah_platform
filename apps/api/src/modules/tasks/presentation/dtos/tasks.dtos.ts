import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  answerObjectionSchema,
  createTaskSchema,
  decideTaskSchema,
  objectTaskSchema,
  taskMatrixQuerySchema,
  taskPolicyInputSchema,
  taskTagInputSchema,
  tasksQuerySchema,
  teamTasksQuerySchema,
  timeEntrySchema,
  transitionTaskSchema,
  updateTaskSchema,
} from '@arweqah-platform/shared';

export class CreateTaskBody extends createZodDto(createTaskSchema) {}
export class UpdateTaskBody extends createZodDto(updateTaskSchema) {}
export class TransitionTaskBody extends createZodDto(transitionTaskSchema) {}
export class DecideTaskBody extends createZodDto(decideTaskSchema) {}
export class ObjectTaskBody extends createZodDto(objectTaskSchema) {}
export class AnswerObjectionBody extends createZodDto(answerObjectionSchema) {}
export class TimeEntryBody extends createZodDto(timeEntrySchema) {}
export class TasksQueryDto extends createZodDto(tasksQuerySchema) {}
export class TeamTasksQueryDto extends createZodDto(teamTasksQuerySchema) {}
export class MatrixQueryDto extends createZodDto(taskMatrixQuerySchema) {}
export class TaskTagBody extends createZodDto(taskTagInputSchema) {}
export class TaskPolicyBody extends createZodDto(taskPolicyInputSchema) {}
export class TaskOptionsQueryDto extends createZodDto(z.strictObject({ search: z.string().trim().max(100).optional() })) {}
export class TagsQueryDto extends createZodDto(z.strictObject({ companyId: z.uuid().optional() })) {}
