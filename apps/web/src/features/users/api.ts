import type { CreateUserInput, Paginated, PlacementInput, UserDto, UsersQuery } from '@arweqah-platform/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';

const KEY = ['users'];
type ListQuery = Partial<Pick<UsersQuery, 'page' | 'search' | 'status'>>;

export const useUsers = (q: ListQuery) => useQuery({ queryKey: [...KEY, q], queryFn: () => apiClient.get<Paginated<UserDto>>('/users', q) });

function useUserMutation<TInput>(fn: (input: TInput) => Promise<UserDto>) {
  const client = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => client.invalidateQueries({ queryKey: KEY }) });
}

export const useCreateUser = () => useUserMutation((input: CreateUserInput) => apiClient.post<UserDto>('/users', input));
export const useAssignRoles = () => useUserMutation(({ id, roleIds }: { id: string; roleIds: string[] }) => apiClient.put<UserDto>(`/users/${id}/roles`, { roleIds }));
export const useSetPlacement = () => useUserMutation(({ id, placement }: { id: string; placement: PlacementInput }) => apiClient.put<UserDto>(`/users/${id}/placement`, placement));
export const useSetActive = () =>
  useUserMutation(({ id, active }: { id: string; active: boolean }) => apiClient.post<UserDto>(`/users/${id}/${active ? 'activate' : 'deactivate'}`));
