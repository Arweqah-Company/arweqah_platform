import type {
  AddJobTitlesInput,
  CopyOrgLevelsInput,
  CreateOrgNodeInput,
  JobTitleDto,
  MoveOrgNodeInput,
  OrgLevelDto,
  OrgLevelsPreviewDto,
  OrgNodeDto,
  OrgTreeDto,
  PreviewOrgLevelsInput,
  SaveOrgLevelsInput,
  UpdateJobTitleInput,
  UpdateOrgNodeInput,
} from '@arweqah-platform/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';

export { useCompanyOptions } from '@/core/api/lookups';

export const useOrgTree = (companyId: string | undefined) =>
  useQuery({ queryKey: ['org', 'tree', companyId], enabled: !!companyId, queryFn: () => apiClient.get<OrgTreeDto>(`/org/companies/${companyId}/tree`) });

function useOrgMutation<TIn, TOut>(fn: (input: TIn) => Promise<TOut>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    // Structure changes can move employees and change the lists that depend on it.
    onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: ['org'] }), client.invalidateQueries({ queryKey: ['lookups'] }), client.invalidateQueries({ queryKey: ['employees'] })]),
  });
}

export const usePreviewLevels = () => useMutation({ mutationFn: (input: PreviewOrgLevelsInput) => apiClient.post<OrgLevelsPreviewDto>('/org/levels/preview', input) });
export const useSaveLevels = () => useOrgMutation((input: SaveOrgLevelsInput) => apiClient.post<OrgLevelDto[]>('/org/levels', input));
export const useCopyLevels = () => useOrgMutation((input: CopyOrgLevelsInput) => apiClient.post<OrgLevelDto[]>('/org/levels/copy', input));
export const useCreateNode = () => useOrgMutation((input: CreateOrgNodeInput) => apiClient.post<OrgNodeDto>('/org/nodes', input));
export const useUpdateNode = (id: string) => useOrgMutation((input: UpdateOrgNodeInput) => apiClient.put<OrgNodeDto>(`/org/nodes/${id}`, input));
export const useMoveNode = (id: string) => useOrgMutation((input: MoveOrgNodeInput) => apiClient.post<OrgNodeDto>(`/org/nodes/${id}/move`, input));
export const useDeleteNode = () => useOrgMutation((id: string) => apiClient.delete(`/org/nodes/${id}`));
export const useAddTitles = (nodeId: string) => useOrgMutation((input: AddJobTitlesInput) => apiClient.post<JobTitleDto[]>(`/org/nodes/${nodeId}/job-titles`, input));
export const useUpdateTitle = () => useOrgMutation(({ id, ...input }: UpdateJobTitleInput & { id: string }) => apiClient.put<JobTitleDto>(`/org/job-titles/${id}`, input));
export const useDeleteTitle = () => useOrgMutation((id: string) => apiClient.delete(`/org/job-titles/${id}`));
