import type { BasicRequestDto, BasicRequestInput, OwnProfileDto } from '@arweqah-platform/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';
import { PROFILE_KEY } from '@/core/theme/use-save-preferences';

export const useOwnProfile = () => useQuery({ queryKey: PROFILE_KEY, queryFn: () => apiClient.get<OwnProfileDto>('/me/profile') });

const BASIC_KEY = ['profile', 'basic-request'];

/** My newest request to change basic data (pending, decided or cancelled), or null when I never sent one. */
export const useBasicRequest = (enabled: boolean) => useQuery({ queryKey: BASIC_KEY, enabled, queryFn: async () => (await apiClient.get<BasicRequestDto | null>('/me/profile/basic-request')) ?? null });

export function useSendBasicRequest() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: BasicRequestInput) => apiClient.put<BasicRequestDto>('/me/profile/basic-request', input), onSuccess: (dto) => client.setQueryData(BASIC_KEY, dto) });
}

export function useCancelBasicRequest() {
  const client = useQueryClient();
  return useMutation({ mutationFn: () => apiClient.request<void>('/me/profile/basic-request', { method: 'DELETE' }), onSuccess: () => client.invalidateQueries({ queryKey: BASIC_KEY }) });
}
