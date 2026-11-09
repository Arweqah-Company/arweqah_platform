import type { CatalogItemDto, CatalogItemInput, CycleDateKey, CycleStateDto, EvalFileInput, EvalFileResult, OpenCycleInput, SetCycleDateInput } from '@arweqah-platform/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';

export const CYCLE_KEY = ['performance', 'cycle'] as const;

/** The cycle in progress (or the last), the readiness list and the catalog. */
export const useCycle = () => useQuery({ queryKey: CYCLE_KEY, queryFn: () => apiClient.get<CycleStateDto>('/performance/cycle') });

/** Every write on the cycle replaces the cached state with the answer. */
function useCycleWrite<TIn>(write: (input: TIn) => Promise<CycleStateDto>) {
  const client = useQueryClient();
  return useMutation({ mutationFn: write, onSuccess: (state) => client.setQueryData(CYCLE_KEY, state) });
}

export const useOpenCycle = () => useCycleWrite((input: OpenCycleInput) => apiClient.post<CycleStateDto>('/performance/cycle/open', input));
export const useAdvanceCycle = () => useCycleWrite(() => apiClient.post<CycleStateDto>('/performance/cycle/advance', {}));
export const useCloseCycle = () => useCycleWrite(() => apiClient.post<CycleStateDto>('/performance/cycle/close', {}));
export const useSetDate = () => useCycleWrite(({ key, ...input }: { key: CycleDateKey } & SetCycleDateInput) => apiClient.put<CycleStateDto>(`/performance/cycle/dates/${key}`, input));

/** The catalog is part of the cycle state: adding or removing an item reads it again. */
export function useAddItem() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: CatalogItemInput) => apiClient.post<CatalogItemDto>('/performance/cycle/catalog', input), onSuccess: () => client.invalidateQueries({ queryKey: CYCLE_KEY }) });
}

export function useRemoveItem() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (id: string) => apiClient.delete(`/performance/cycle/catalog/${id}`), onSuccess: () => client.invalidateQueries({ queryKey: CYCLE_KEY }) });
}

/** Reads the evaluation file on the server: with `dryRun` it only reports; saving refreshes the readiness list. */
export const readEvalFile = (input: EvalFileInput) => apiClient.post<EvalFileResult>('/performance/templates/file', input);
export function useSaveEvalFile() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (text: string) => readEvalFile({ text, dryRun: false }), onSuccess: () => client.invalidateQueries({ queryKey: CYCLE_KEY }) });
}
