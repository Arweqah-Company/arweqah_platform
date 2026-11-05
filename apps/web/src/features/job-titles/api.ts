import type {
  ImportJobTitlesInput,
  JobTitleCardDto,
  JobTitleContentDto,
  JobTitleContentInput,
  JobTitleDto,
  JobTitleInput,
  JobTitleListItemDto,
  OrgTreeDto,
  Paginated,
  TitleImportResultDto,
  UpdateJobTitleInput,
} from '@arweqah-platform/shared';
import { CorePermission } from '@arweqah-platform/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';
import { usePermissions } from '@/core/permissions/can';

export { useCompanyOptions } from '@/core/api/lookups';

/** One title being added: its names, grade, track and role template, and the title it reports to. */
export type TitleRowInput = JobTitleInput & { reportsToTitleId?: string | null };

/** The card of a title; `company` is the company whose manager chain is walked (the viewer's own when left out). */
export const useTitleCard = (id: string | null, company?: string) =>
  useQuery({ queryKey: ['job-titles', 'card', id, company ?? null], enabled: !!id, queryFn: () => apiClient.get<JobTitleCardDto>(`/org/job-titles/${id}/card`, { company }), placeholderData: keepPreviousData });

/** Titles to pick a reporting line from: found by name or code from the first letter. */
export const useTitleSearch = (search: string, enabled = true) =>
  useQuery({ queryKey: ['job-titles', 'search', search], enabled, queryFn: () => apiClient.get<Paginated<JobTitleListItemDto>>('/org/job-titles', { search: search || undefined, pageSize: 20 }), placeholderData: keepPreviousData });

/** The three kinds of unit a title list is narrowed by; a person without the full-view key picks among the units they see. */
export function useUnitsByType() {
  const canFull = usePermissions().can(CorePermission.OrgViewFull);
  const view = canFull ? 'full' : 'team';
  return useQuery({ queryKey: ['org', 'tree', view, null], queryFn: () => apiClient.get<OrgTreeDto>('/org/tree', { view }), staleTime: 60_000 });
}

/** Every change here can move employees' reporting lines, roles and the unit counts of the structure. */
function useTitleMutation<TIn, TOut>(fn: (input: TIn) => Promise<TOut>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => Promise.all(['org', 'job-titles', 'lookups', 'employees'].map((key) => client.invalidateQueries({ queryKey: [key] }))),
  });
}

export const useAddTitles = (nodeId: string) => useTitleMutation((input: { jobTitles: TitleRowInput[] }) => apiClient.post<JobTitleDto[]>(`/org/nodes/${nodeId}/job-titles`, input));
export const useUpdateTitle = () => useTitleMutation(({ id, ...input }: UpdateJobTitleInput & { id: string }) => apiClient.put<JobTitleDto>(`/org/job-titles/${id}`, input));
export const useDeleteTitle = () => useTitleMutation((id: string) => apiClient.delete(`/org/job-titles/${id}`));
export const useUpdateContent = (id: string) => useTitleMutation((input: JobTitleContentInput) => apiClient.put<JobTitleContentDto>(`/org/job-titles/${id}/content`, input));

/** The bulk import: with `dryRun` it only reports what each row would do. */
export const importTitles = (input: ImportJobTitlesInput) => apiClient.post<TitleImportResultDto>('/org/job-titles/bulk', input);
