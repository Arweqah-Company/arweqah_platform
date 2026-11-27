import type {
  AddTaskFilesInput,
  TaskFollowerDto,
  AnswerObjectionInput,
  CreateTaskInput,
  DecideTaskInput,
  ObjectTaskInput,
  TaskDepartmentOptionDto,
  TaskDto,
  TaskFormOptionsDto,
  TaskMatrixDto,
  TaskPolicyDto,
  TaskPolicyInput,
  TaskSummaryDto,
  TaskTagAdminDto,
  TaskTagInput,
  TimeEntryInput,
  TransitionTaskInput,
  UpdateTaskInput,
} from '@arweqah-platform/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';

const KEY = 'tasks';

export const useTask = (id: string | undefined) => useQuery({ queryKey: [KEY, 'one', id], enabled: !!id, queryFn: () => apiClient.get<TaskDto>(`/tasks/${id}`) });

/** What the new-task form offers: who may get the task, the department's tags, and who approves a task for oneself. */
export const useTaskOptions = (enabled = true, search = '') =>
  useQuery({ queryKey: [KEY, 'options', search], enabled, queryFn: () => apiClient.get<TaskFormOptionsDto>('/tasks/options', { search }), staleTime: 30_000 });

export const useMatrix = (scope: 'mine' | 'team') => useQuery({ queryKey: [KEY, 'matrix', scope], queryFn: () => apiClient.get<TaskMatrixDto>('/tasks/matrix', { scope }) });

/** The numbers and short lists of the home page. */
export const useTaskSummary = (enabled: boolean) => useQuery({ queryKey: [KEY, 'summary'], enabled, staleTime: 60_000, queryFn: () => apiClient.get<TaskSummaryDto>('/tasks/summary') });

/** The followers of a task and who may still be added: only for who may manage them. */
export const useTaskFollowers = (id: string, enabled: boolean) => useQuery({ queryKey: [KEY, 'followers', id], enabled, queryFn: () => apiClient.get<TaskFollowerDto[]>(`/tasks/${id}/followers`) });
export const useFollowerCandidates = (id: string, search: string, enabled: boolean) =>
  useQuery({ queryKey: [KEY, 'followers', id, 'candidates', search], enabled, queryFn: () => apiClient.get<TaskFollowerDto[]>(`/tasks/${id}/followers/candidates`, search ? { search } : undefined) });

/** Every change refreshes the lists, the open task and the summary. */
export function useTaskMutation<TIn, TOut>(fn: (input: TIn) => Promise<TOut>) {
  const client = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => client.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith(KEY) }) });
}

export const useAddFollower = (id: string) => useTaskMutation((userId: string) => apiClient.post<TaskFollowerDto[]>(`/tasks/${id}/followers`, { userIds: [userId] }));
export const useRemoveFollower = (id: string) => useTaskMutation((userId: string) => apiClient.request<TaskFollowerDto[]>(`/tasks/${id}/followers/${userId}`, { method: 'DELETE' }));

export const useCreateTask = () => useTaskMutation((input: CreateTaskInput) => apiClient.post<TaskDto>('/tasks', input));
export const useUpdateTask = (id: string) => useTaskMutation((input: UpdateTaskInput) => apiClient.request<TaskDto>(`/tasks/${id}`, { method: 'PATCH', body: input }));
export const useMoveTask = () => useTaskMutation(({ id, ...body }: Omit<TransitionTaskInput, 'fileIds'> & { id: string; fileIds?: string[] }) => apiClient.post<TaskDto>(`/tasks/${id}/transition`, body));

export type DecideAction = 'approve' | 'reject' | 'resubmit';
export const useDecide = (id: string) => useTaskMutation(({ action, ...body }: DecideTaskInput & { action: DecideAction }) => apiClient.post<TaskDto>(`/tasks/${id}/${action}`, body));
export const useObject = (id: string) => useTaskMutation((input: ObjectTaskInput) => apiClient.post<TaskDto>(`/tasks/${id}/objection`, input));
export const useAnswerObjection = (id: string) => useTaskMutation((input: AnswerObjectionInput) => apiClient.post<TaskDto>(`/tasks/${id}/objection/answer`, input));
/** Files of a task: reference files added later, delivery files handed in, and taking one off. */
export const useAddTaskFiles = (id: string, kind: 'reference' | 'delivery') => useTaskMutation((input: AddTaskFilesInput) => apiClient.post<TaskDto>(`/tasks/${id}/${kind === 'reference' ? 'files' : 'deliveries'}`, input));
export const useRemoveTaskFile = (id: string) => useTaskMutation((fileId: string) => apiClient.request<TaskDto>(`/tasks/${id}/files/${fileId}`, { method: 'DELETE' }));
export const useLogTime = (id: string) => useTaskMutation((input: TimeEntryInput) => apiClient.post<TaskDto>(`/tasks/${id}/time`, input));
/**
 * A task the person can no longer open (deleted, or unfollowed by a follower who had no other way in) is dropped from the cache, not refetched: the refetch would answer 404 and be retried
 * for seconds while the button waits. The lists and the summary refresh in the background.
 */
function useGoneTaskMutation<TIn, TOut>(id: string, fn: (input: TIn) => Promise<TOut>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result) => {
      if (result === null || result === undefined) client.removeQueries({ queryKey: [KEY, 'one', id] });
      void client.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith(KEY) });
    },
  });
}

export const useDeleteTask = (id: string) => useGoneTaskMutation(id, () => apiClient.request<void>(`/tasks/${id}`, { method: 'DELETE' }));
export const useRestore = (id: string) => useTaskMutation(() => apiClient.post<TaskDto>(`/tasks/${id}/restore`));
export const useFollow = (id: string) =>
  useGoneTaskMutation(id, async (on: boolean) => (on ? await apiClient.post<TaskDto>(`/tasks/${id}/follow`) : ((await apiClient.request<TaskDto | null>(`/tasks/${id}/follow`, { method: 'DELETE' })) ?? null)));

// ------------------------------------------------------------------ tags and policies

export const useTags = () => useQuery({ queryKey: [KEY, 'tags'], queryFn: () => apiClient.get<TaskTagAdminDto[]>('/task-tags') });
export const useTagDepartments = (enabled: boolean) => useQuery({ queryKey: [KEY, 'tag-departments'], enabled, queryFn: () => apiClient.get<TaskDepartmentOptionDto[]>('/task-tags/departments') });
export const useSaveTag = () =>
  useTaskMutation((input: { id?: string; values: TaskTagInput }) => (input.id ? apiClient.put<TaskTagAdminDto>(`/task-tags/${input.id}`, input.values) : apiClient.post<TaskTagAdminDto>('/task-tags', input.values)));
export const useRemoveTag = () => useTaskMutation((id: string) => apiClient.delete(`/task-tags/${id}`));

export const usePolicy = (enabled: boolean, companyId: string) =>
  useQuery({ queryKey: [KEY, 'policy', companyId], enabled, queryFn: () => apiClient.get<TaskPolicyDto>('/task-policies', { companyId: companyId || undefined }) });
export const useSavePolicy = (companyId: string) =>
  useTaskMutation((input: TaskPolicyInput) => apiClient.put<TaskPolicyDto>(`/task-policies${companyId ? `?companyId=${companyId}` : ''}`, input));
