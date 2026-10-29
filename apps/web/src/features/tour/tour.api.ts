import type { TourDto, TourId } from '@arweqah-platform/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { apiClient } from '@/core/api/api-client';

export const tourKey = (tour: TourId) => ['tour', tour] as const;

/** One person's tour: the steps they may see, how far they got, and what is new since. A failure is quiet: the tour simply does not start. */
export function useTourQuery(tour: TourId, enabled: boolean) {
  return useQuery({ queryKey: tourKey(tour), queryFn: () => apiClient.get<TourDto>(`/me/tour/${tour}`), enabled, retry: false, staleTime: 60_000 });
}

export type TourAction = 'complete' | 'skip' | 'restart';

/** Records how a tour ended (or forgets it) and refreshes what the screens read. */
export function useTourAction() {
  const client = useQueryClient();
  return useCallback(async (tour: TourId, action: TourAction): Promise<TourDto> => {
    const dto = await apiClient.post<TourDto>(`/me/tour/${tour}/${action}`);
    client.setQueryData(tourKey(tour), dto);
    return dto;
  }, [client]);
}
