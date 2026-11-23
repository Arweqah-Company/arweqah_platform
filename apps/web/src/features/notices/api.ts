import type {
  AddNoticeWriterInput,
  CreateNoticeChannelInput,
  CreateNoticeInput,
  NoticeAcknowledgementsDto,
  NoticeAcknowledgementsQuery,
  NoticeAudienceCountDto,
  NoticeAudienceOptionsDto,
  NoticeAudienceReportDto,
  NoticeChannelCode,
  NoticeChannelDto,
  NoticeChannelRefDto,
  NoticeChannelsDto,
  NoticeDetailsDto,
  NoticeFilterOptionsDto,
  NoticeFlowDto,
  NoticeHomeDto,
  NoticeMineDetailsDto,
  NoticeSettingsInput,
  NoticeUnitRefDto,
  NoticeWriterCandidateDto,
  RenameNoticeChannelInput,
  UpdateNoticeInput,
  NoticeAudienceRuleInput,
} from '@arweqah-platform/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';

/** Every query of this module starts with «notices», so one call refreshes them all after a change. */
export const NOTICES = 'notices';

export const useNoticeHome = (enabled = true) =>
  useQuery({ queryKey: [NOTICES, 'home'], enabled, staleTime: 30_000, queryFn: () => apiClient.get<NoticeHomeDto>('/notices/home') });

export const useMineNotice = (id: string | null) =>
  useQuery({ queryKey: [NOTICES, 'mine-one', id], enabled: !!id, queryFn: () => apiClient.get<NoticeMineDetailsDto>(`/notices/mine/${id}`) });

/** The channels that have a notice for the person: the choices of the channel filter of «My notices» (any employee may read it). */
export const useMineChannels = () => useQuery({ queryKey: [NOTICES, 'mine-channels'], staleTime: 60_000, queryFn: () => apiClient.get<NoticeChannelRefDto[]>('/notices/mine/channels') });

export const useNoticeOptions = (enabled = true) =>
  useQuery({ queryKey: [NOTICES, 'options'], enabled, queryFn: () => apiClient.get<NoticeFilterOptionsDto>('/notices/options') });

export const useNotice = (id: string | null) => useQuery({ queryKey: [NOTICES, 'one', id], enabled: !!id, queryFn: () => apiClient.get<NoticeDetailsDto>(`/notices/${id}`) });

export const useNoticeFlow = (id: string) => useQuery({ queryKey: [NOTICES, 'flow', id], queryFn: () => apiClient.get<NoticeFlowDto>(`/notices/${id}/flow`) });

export const useNoticeAudience = (id: string) => useQuery({ queryKey: [NOTICES, 'audience', id], queryFn: () => apiClient.get<NoticeAudienceReportDto>(`/notices/${id}/audience`) });

export const useAcknowledgements = (id: string, query: Partial<NoticeAcknowledgementsQuery> & { page: number; pageSize: number; search?: string }) =>
  useQuery({ queryKey: [NOTICES, 'acks', id, query], placeholderData: keepPreviousData, queryFn: () => apiClient.get<NoticeAcknowledgementsDto>(`/notices/${id}/acknowledgements`, query) });

/** «Reaches N employees» under the audience picker (after a short pause, set by the caller). */
export const useAudienceCount = (audience: NoticeAudienceRuleInput[], enabled: boolean) =>
  useQuery({
    queryKey: [NOTICES, 'count', audience],
    enabled,
    placeholderData: keepPreviousData,
    queryFn: () => apiClient.post<NoticeAudienceCountDto>('/notices/audience/count', { audience }),
  });

/** What a writer may aim a notice at (units, every job title, groups of people): one call, the same for every channel writer. */
export const useAudienceOptions = () =>
  useQuery({ queryKey: [NOTICES, 'audience-options'], staleTime: 60_000, queryFn: () => apiClient.get<NoticeAudienceOptionsDto>('/notices/audience/options') });

/** Every write refreshes the lists, the counters and the open notice. */
function useNoticeMutation<TIn, TOut = unknown>(fn: (input: TIn) => Promise<TOut>) {
  const client = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => client.invalidateQueries({ predicate: (q) => q.queryKey[0] === NOTICES || String(q.queryKey[0]).startsWith('notices-') }) });
}

const post = <T = unknown>(path: string, body?: unknown) => apiClient.post<T>(path, body);

export const useCreateNotice = () => useNoticeMutation((input: CreateNoticeInput) => post<NoticeDetailsDto>('/notices', input));
export const useUpdateNotice = (id: string) => useNoticeMutation((input: UpdateNoticeInput) => apiClient.put<NoticeDetailsDto>(`/notices/${id}`, input));
export const useDeleteNotice = () => useNoticeMutation((id: string) => apiClient.delete(`/notices/${id}`));

export type NoticeAction = 'submit' | 'pin' | 'archive' | 'revise' | 'revise-cancel' | 'approve';
export const useNoticeAction = () => useNoticeMutation((input: { id: string; action: NoticeAction; revision?: number }) => post(`/notices/${input.id}/${input.action}`, { revision: input.revision }));
export const useUnpinNotice = () => useNoticeMutation((id: string) => apiClient.delete(`/notices/${id}/pin`));
export const useRejectNotice = () => useNoticeMutation((input: { id: string; reason: string; revision?: number }) => post(`/notices/${input.id}/reject`, { reason: input.reason, revision: input.revision }));

export const useReadNotice = () => useNoticeMutation((id: string) => post(`/notices/mine/${id}/read`));
export const useAcknowledgeNotice = () => useNoticeMutation((id: string) => post(`/notices/mine/${id}/acknowledge`));

// ------------------------------------------------------------------ channels

export const useChannels = (enabled = true) => useQuery({ queryKey: [NOTICES, 'channels'], enabled, queryFn: () => apiClient.get<NoticeChannelsDto>('/notices/channels') });

export const useWriterCandidates = (code: NoticeChannelCode, search: string) =>
  useQuery({ queryKey: [NOTICES, 'candidates', code, search], placeholderData: keepPreviousData, queryFn: () => apiClient.get<NoticeWriterCandidateDto[]>(`/notices/channels/${code}/candidates`, { search: search || undefined }) });

export const useAddWriter = (code: NoticeChannelCode) => useNoticeMutation((input: AddNoticeWriterInput) => post(`/notices/channels/${code}/writers`, input));
export const useRemoveWriter = (code: NoticeChannelCode) => useNoticeMutation((userId: string) => apiClient.delete(`/notices/channels/${code}/writers/${userId}`));
export const useSaveSettings = () => useNoticeMutation((input: NoticeSettingsInput) => apiClient.put('/notices/channels/settings', input));

/** The units a person may make a channel for (the reach of `notices.channel_add`), found by name. */
export const useChannelUnits = (search: string, enabled = true) =>
  useQuery({ queryKey: [NOTICES, 'channel-units', search], enabled, placeholderData: keepPreviousData, queryFn: () => apiClient.get<NoticeUnitRefDto[]>('/notices/channels/units', { search: search || undefined }) });

export const useCreateChannel = () => useNoticeMutation((input: CreateNoticeChannelInput) => post<NoticeChannelDto>('/notices/channels', input));
export const useRenameChannel = (code: NoticeChannelCode) => useNoticeMutation((input: RenameNoticeChannelInput) => apiClient.put<NoticeChannelDto>(`/notices/channels/${code}`, input));
export const useToggleChannel = () => useNoticeMutation((input: { code: NoticeChannelCode; enable: boolean }) => post<NoticeChannelDto>(`/notices/channels/${input.code}/${input.enable ? 'enable' : 'disable'}`, {}));
export const useDeleteChannel = () => useNoticeMutation((code: NoticeChannelCode) => apiClient.delete(`/notices/channels/${code}`));
