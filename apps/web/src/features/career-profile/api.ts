import type {
  CareerContent,
  CareerListStatus,
  CareerTitleContentDto,
  CareerTitleListItemDto,
  CompetencyStatusDto,
  CreateRequestInput,
  DevelopmentRequestDto,
  ExtractTitleFileInput,
  ImportLearningLinksInput,
  LearningRecordDto,
  LearningImportResultDto,
  MyCareerProfileDto,
  MyProgressDto,
  RecordCompetencyInput,
  ReopenAcknowledgementInput,
  ReopenAcknowledgementResultDto,
  RequestPlanKind,
  RequestPreviewDto,
  SubmitProofInput,
  TeamMemberDetailDto,
  TitleFileResultDto,
} from '@arweqah-platform/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';

export const MY_CAREER_KEY = ['career-profile', 'me'] as const;

/** The signed-in employee's own career path (the page and the gate read the same answer). */
export const useMyCareer = (enabled = true) =>
  useQuery({ queryKey: MY_CAREER_KEY, enabled, staleTime: 30_000, queryFn: () => apiClient.get<MyCareerProfileDto>('/career-profile/me') });

/** The version the person read; the answer replaces the cached path so the gate lifts at once. */
export function useAcknowledge() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (contentVersion: number) => apiClient.post<MyCareerProfileDto>('/career-profile/me/acknowledge', { contentVersion }),
    onSuccess: (me) => client.setQueryData(MY_CAREER_KEY, me),
  });
}

export const CAREER_TITLES_KEY = 'career-titles';
/** The key of the HR list (`useServerList` caches it under the list's name). */
export const CAREER_LIST_KEY = 'career-content';

/** The career content of one title (read to preview it). */
export const useTitleContent = (titleId: string | null) =>
  useQuery({ queryKey: [CAREER_TITLES_KEY, 'content', titleId], enabled: !!titleId, queryFn: () => apiClient.get<CareerTitleContentDto>(`/career/titles/${titleId}/content`) });

/** Every write on a title's path refreshes the list, the content and the person's own path. */
function useTitleWrite<TIn, TOut>(titleId: string, write: (input: TIn) => Promise<TOut>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSuccess: () => Promise.all([CAREER_TITLES_KEY, CAREER_LIST_KEY, 'career-profile'].map((key) => client.invalidateQueries({ queryKey: [key] }))),
  });
}

/** Saves the whole document; `expectedVersion` makes a save on an older version a 409 instead of overwriting a newer one. */
export const useSaveContent = (titleId: string) =>
  useTitleWrite(titleId, (input: { content: CareerContent; expectedVersion: number }) => apiClient.put<CareerTitleContentDto>(`/career/titles/${titleId}/content`, input));

export const useSetReady = (titleId: string) => useTitleWrite(titleId, () => apiClient.post<CareerTitleContentDto>(`/career/titles/${titleId}/publish`, {}));
export const useSetDraft = (titleId: string) => useTitleWrite(titleId, () => apiClient.post<CareerTitleContentDto>(`/career/titles/${titleId}/draft`, {}));
export const useReopenAck = (titleId: string) =>
  useTitleWrite(titleId, (input: ReopenAcknowledgementInput) => apiClient.post<ReopenAcknowledgementResultDto>(`/career/titles/${titleId}/reopen-acknowledgement`, input));

/** Reads a title file: with `dryRun` it only reports what the file holds. */
export const readTitleFile = (titleId: string, input: ExtractTitleFileInput) => apiClient.post<TitleFileResultDto>(`/career/titles/${titleId}/file`, input);
export const useReadTitleFile = (titleId: string) => useTitleWrite(titleId, (input: ExtractTitleFileInput) => readTitleFile(titleId, input));

/** The learning-links sheet: with `dryRun` it only reports what each row would do. */
export const importLearningLinks = (input: ImportLearningLinksInput) => apiClient.post<LearningImportResultDto>('/career/learning-links', input);

export type { CareerListStatus, CareerTitleListItemDto };

export const MY_LEARNING_KEY = ['career-profile', 'learning'] as const;
export const MY_PROGRESS_KEY = ['career-profile', 'progress'] as const;

/** The proofs the signed-in employee sent, and how far they are (the learning plan and its filters read them). */
export const useMyLearning = (enabled = true) => useQuery({ queryKey: MY_LEARNING_KEY, enabled, queryFn: () => apiClient.get<LearningRecordDto[]>('/career-profile/me/learning') });

/** Units done, approved hours, the medals and the ticks of «required». */
export const useMyProgress = (enabled = true) => useQuery({ queryKey: MY_PROGRESS_KEY, enabled, queryFn: () => apiClient.get<MyProgressDto>('/career-profile/me/progress') });

/** Sends a proof: the file first (when there is one), then the proof that points at it. */
export function useSubmitProof() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, ...input }: Omit<SubmitProofInput, 'fileId'> & { file?: File }) => {
      let fileId: string | undefined;
      if (file) {
        const form = new FormData();
        form.append('file', file);
        fileId = (await apiClient.post<{ id: string }>('/files', form)).id;
      }
      return apiClient.post<LearningRecordDto>('/career-profile/me/learning', { ...input, ...(fileId ? { fileId } : {}) });
    },
    onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: MY_LEARNING_KEY }), client.invalidateQueries({ queryKey: MY_PROGRESS_KEY })]),
  });
}

/** Ticks or unticks an item of «required»; the answer replaces the cached progress. */
export function useTickRequired() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ index, done }: { index: number; done: boolean }) => apiClient.put<MyProgressDto>(`/career-profile/me/required/${index}`, { done }),
    onSuccess: (progress) => client.setQueryData(MY_PROGRESS_KEY, progress),
  });
}

export const CERTIFICATES_KEY = 'career-certificates';

/** One decision on a proof: approve, reject with a reason, or refer to the direct manager. The queue is read again after it. */
export function useDecideProof(id: string) {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: [CERTIFICATES_KEY] });
  return {
    approve: useMutation({ mutationFn: () => apiClient.post(`/career/certificates/${id}/approve`, {}), onSuccess: done }),
    reject: useMutation({ mutationFn: (reason: string) => apiClient.post(`/career/certificates/${id}/reject`, { reason }), onSuccess: done }),
    refer: useMutation({ mutationFn: () => apiClient.post(`/career/certificates/${id}/refer`, {}), onSuccess: done }),
  };
}

export const useTeamMember = (employeeId: string) => useQuery({ queryKey: ['career-team', 'member', employeeId], queryFn: () => apiClient.get<TeamMemberDetailDto>(`/career/team/${employeeId}`) });

/** The manager's decision on a proof referred to them; the team page and the member are read again after it. */
export function useTeamDecision(employeeId: string, proofId: string) {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: ['career-team'] });
  const base = `/career/team/${employeeId}/proofs/${proofId}`;
  return {
    approve: useMutation({ mutationFn: () => apiClient.post(`${base}/approve`, {}), onSuccess: done }),
    reject: useMutation({ mutationFn: (reason: string) => apiClient.post(`${base}/reject`, { reason }), onSuccess: done }),
  };
}

export const MY_REQUESTS_KEY = ['career-profile', 'requests'] as const;
export const REQUESTS_KEY = 'career-requests';

/** The signed-in employee's own development requests. */
export const useMyRequests = (enabled = true) => useQuery({ queryKey: MY_REQUESTS_KEY, enabled, queryFn: () => apiClient.get<DevelopmentRequestDto[]>('/career-profile/me/requests') });

/** Who would decide a request of this cost and plan, and what is left of the yearly budget (read while the person types). */
export const useRequestPreview = (cost: number, plan: RequestPlanKind, enabled = true) =>
  useQuery({ enabled, queryKey: [...MY_REQUESTS_KEY, 'preview', cost, plan], placeholderData: (previous) => previous, queryFn: () => apiClient.get<RequestPreviewDto>(`/career-profile/me/requests/preview?cost=${cost}&plan=${plan}`) });

/** Sends a request: the agreement file first (when there is one), then the request that points at it. */
export function useCreateRequest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, ...input }: Omit<CreateRequestInput, 'agreementFileId'> & { file?: File }) => {
      let agreementFileId: string | undefined;
      if (file) {
        const form = new FormData();
        form.append('file', file);
        agreementFileId = (await apiClient.post<{ id: string }>('/files', form)).id;
      }
      return apiClient.post<DevelopmentRequestDto>('/career-profile/me/requests', { ...input, ...(agreementFileId ? { agreementFileId } : {}) });
    },
    onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: MY_REQUESTS_KEY }), client.invalidateQueries({ queryKey: MY_PROGRESS_KEY })]),
  });
}

/** One decision on a request that is with the signed-in person; every list of requests and the budget card are read again after it. */
export function useDecideRequest(id: string) {
  const client = useQueryClient();
  const done = () => Promise.all([REQUESTS_KEY, 'career-profile'].map((key) => client.invalidateQueries({ queryKey: [key] })));
  return {
    approve: useMutation({ mutationFn: () => apiClient.post(`/career/requests/${id}/approve`, {}), onSuccess: done }),
    reject: useMutation({ mutationFn: (reason: string) => apiClient.post(`/career/requests/${id}/reject`, { reason }), onSuccess: done }),
  };
}

/** The manager records (or takes back) the level an employee reached in a competency of their title. */
export function useRecordCompetency(employeeId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordCompetencyInput) => apiClient.put<CompetencyStatusDto[]>(`/career/team/${employeeId}/competencies`, input),
    onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: ['career-team', 'member', employeeId] }), client.invalidateQueries({ queryKey: MY_PROGRESS_KEY })]),
  });
}
