import { z } from 'zod';

/** Followers a person adds to a task they own, or a manager adds to a task of their team (FR-163): active employees of the same company. */
export const addTaskFollowersSchema = z.strictObject({ userIds: z.array(z.uuid()).min(1).max(20) });
export type AddTaskFollowersInput = z.infer<typeof addTaskFollowersSchema>;

export const taskFollowerCandidatesQuerySchema = z.strictObject({ search: z.string().trim().max(100).optional() });
export type TaskFollowerCandidatesQuery = z.infer<typeof taskFollowerCandidatesQuerySchema>;

export interface TaskFollowerDto {
  userId: string;
  name: string;
}
