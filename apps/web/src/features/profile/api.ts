import type { OwnProfileDto } from '@arweqah-platform/shared';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';
import { PROFILE_KEY } from '@/core/theme/use-save-preferences';

export const useOwnProfile = () => useQuery({ queryKey: PROFILE_KEY, queryFn: () => apiClient.get<OwnProfileDto>('/me/profile') });
