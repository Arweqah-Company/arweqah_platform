import type { EvalFileContent, CatalogItemDto, CatalogItemInput, CycleDateKey, CycleStateDto, EvalFileInput, EvalFileResult, FiscalInput, MyEvaluationDto, OpenCycleInput, ReminderDto, ReminderInput, SaveSelfEvaluationInput, ScaleInput, SetCycleDateInput, StageTemplateInput, TemplatesDto } from '@arweqah-platform/shared';
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

/** The evaluation file as it is kept: the stage templates, the grade scale and the fiscal card (what the editors open). */
export const TEMPLATES_KEY = ['performance', 'templates'] as const;
export const useTemplates = () => useQuery({ queryKey: TEMPLATES_KEY, queryFn: () => apiClient.get<TemplatesDto>('/performance/templates') });

/** A change to the templates or the reminders reads the page's state again (the readiness list and the lists are part of it). */
function useWrite<TIn, TOut = unknown>(write: (input: TIn) => Promise<TOut>) {
  const client = useQueryClient();
  return useMutation({ mutationFn: write, onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: CYCLE_KEY }), client.invalidateQueries({ queryKey: TEMPLATES_KEY })]) });
}

export const useSaveStage = () => useWrite(({ stage, ...input }: { stage: number } & StageTemplateInput) => apiClient.put<TemplatesDto>(`/performance/templates/stages/${stage}`, input));
export const useRemoveStage = () => useWrite((stage: number) => apiClient.delete(`/performance/templates/stages/${stage}`));
export const useSaveScale = () => useWrite((input: ScaleInput) => apiClient.put<TemplatesDto>('/performance/templates/scale', input));
export const useSaveFiscal = () => useWrite((input: FiscalInput) => apiClient.put<TemplatesDto>('/performance/templates/fiscal-card', input));

export const useAddReminder = () => useWrite((input: ReminderInput) => apiClient.post<ReminderDto>('/performance/cycle/reminders', input));
export const useUpdateReminder = () => useWrite(({ id, ...input }: { id: string } & ReminderInput) => apiClient.put<ReminderDto>(`/performance/cycle/reminders/${id}`, input));
export const useRemoveReminder = () => useWrite((id: string) => apiClient.delete(`/performance/cycle/reminders/${id}`));

/** Reads the evaluation file on the server: with `dryRun` it only reports; saving refreshes the readiness list. */
export const readEvalFile = (input: EvalFileInput) => apiClient.post<EvalFileResult>('/performance/templates/file', input);
/** The AI reads the text and answers like a dry run (nothing is saved); the reviewed content is saved by `confirmEvalFile`. */
export const analyzeEvalFile = (text: string) => apiClient.post<EvalFileResult>('/performance/templates/file/ai', { text });
export function useConfirmEvalFile() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (content: EvalFileContent) => apiClient.post<EvalFileResult>('/performance/templates/file/confirm', { content }), onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: CYCLE_KEY }), client.invalidateQueries({ queryKey: TEMPLATES_KEY })]) });
}

export function useSaveEvalFile() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (text: string) => readEvalFile({ text, dryRun: false }), onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: CYCLE_KEY }), client.invalidateQueries({ queryKey: TEMPLATES_KEY })]) });
}

export const MY_EVALUATION_KEY = ['performance', 'me'] as const;

/** The employee's own evaluation: where the cycle is and, when they have one, the template of their stage and what they wrote. */
export const useMyEvaluation = () => useQuery({ queryKey: MY_EVALUATION_KEY, queryFn: () => apiClient.get<MyEvaluationDto>('/performance/me') });

/** Keeping or sending the form replaces the cached evaluation with the answer. */
function useSelfWrite(call: (input: SaveSelfEvaluationInput) => Promise<MyEvaluationDto>) {
  const client = useQueryClient();
  return useMutation({ mutationFn: call, onSuccess: (mine) => client.setQueryData(MY_EVALUATION_KEY, mine) });
}

export const useSaveSelf = () => useSelfWrite((input) => apiClient.put<MyEvaluationDto>('/performance/me/self', input));
export const useSendSelf = () => useSelfWrite((input) => apiClient.post<MyEvaluationDto>('/performance/me/self/send', input));
