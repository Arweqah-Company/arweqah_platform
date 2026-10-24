import type {
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

/** Every change refreshes the lists, the open task and the summary. */
export function useTaskMutation<TIn, TOut>(fn: (input: TIn) => Promise<TOut>) {
  const client = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => client.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith(KEY) }) });
}

export const useCreateTask = () => useTaskMutation((input: CreateTaskInput) => apiClient.post<TaskDto>('/tasks', input));
export const useUpdateTask = (id: string) => useTaskMutation((input: UpdateTaskInput) => apiClient.request<TaskDto>(`/tasks/${id}`, { method: 'PATCH', body: input }));
export const useMoveTask = () => useTaskMutation(({ id, ...body }: TransitionTaskInput & { id: string }) => apiClient.post<TaskDto>(`/tasks/${id}/transition`, body));

export type DecideAction = 'approve' | 'reject' | 'resubmit';
export const useDecide = (id: string) => useTaskMutation(({ action, ...body }: DecideTaskInput & { action: DecideAction }) => apiClient.post<TaskDto>(`/tasks/${id}/${action}`, body));
export const useObject = (id: string) => useTaskMutation((input: ObjectTaskInput) => apiClient.post<TaskDto>(`/tasks/${id}/objection`, input));
export const useAnswerObjection = (id: string) => useTaskMutation((input: AnswerObjectionInput) => apiClient.post<TaskDto>(`/tasks/${id}/objection/answer`, input));
export const useLogTime = (id: string) => useTaskMutation((input: TimeEntryInput) => apiClient.post<TaskDto>(`/tasks/${id}/time`, input));
export const useRestore = (id: string) => useTaskMutation(() => apiClient.post<TaskDto>(`/tasks/${id}/restore`));
export const useFollow = (id: string) =>
  useTaskMutation((on: boolean) => (on ? apiClient.post<TaskDto>(`/tasks/${id}/follow`) : apiClient.request<TaskDto>(`/tasks/${id}/follow`, { method: 'DELETE' })));

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
