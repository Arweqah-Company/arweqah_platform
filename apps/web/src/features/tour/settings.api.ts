import type { TourId, TourOrderInput, TourStepEditInput, TourStepSettingDto, TourStepsDto } from '@arweqah-platform/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';
import { tourKey } from './tour.api';

const KEY = ['tour-steps'];

export const useTourSteps = () => useQuery({ queryKey: KEY, queryFn: () => apiClient.get<TourStepsDto>('/tour-steps') });

/** Every change refreshes the list, and what each person's tour plays (their cached tours are dropped). */
function useStepMutation<TIn, TOut>(fn: (input: TIn) => Promise<TOut>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => Promise.all([client.invalidateQueries({ queryKey: KEY }), ...(['general', 'admin'] as TourId[]).map((t) => client.invalidateQueries({ queryKey: tourKey(t) }))]),
  });
}

export const useEditStep = () => useStepMutation(({ key, ...body }: { key: string } & TourStepEditInput) => apiClient.put<TourStepSettingDto>(`/tour-steps/${key}`, body));
export const useResetStep = () => useStepMutation((key: string) => apiClient.post<TourStepSettingDto>(`/tour-steps/${key}/reset`));
export const useReorderSteps = () => useStepMutation((input: TourOrderInput) => apiClient.put<TourStepsDto>('/tour-steps/order', input));
