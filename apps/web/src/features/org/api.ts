import type {
  ChangeManagementModeInput,
  ChangeManagementModeResultDto,
  CreateOrgNodeInput,
  MoveOrgNodeInput,
  EndLeaderInput,
  OrgLevelsDto,
  OrgNodeLeadersDto,
  OrgNodeVersionsDto,
  Paginated,
  EmployeeListItemDto,
  SetLeaderInput,
  UpdateCharterInput,
  OrgNodeDto,
  OrgTreeDto,
  OrgTreeView,
  SaveOrgLevelRulesInput,
  SaveOrgLevelsInput,
  SetOrgNodeCodeInput,
  UpdateOrgNodeInput,
} from '@arweqah-platform/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';

export { useCompanyOptions } from '@/core/api/lookups';

/** `team` is the viewer's own company (decided by the server); `full` and `asCompany` need `org.view_full`. */
export interface OrgTreeParams {
  view: OrgTreeView;
  asCompany?: string;
}

export const useOrgTree = (params: OrgTreeParams, enabled = true) =>
  useQuery({ queryKey: ['org', 'tree', params.view, params.asCompany ?? null], enabled, queryFn: () => apiClient.get<OrgTreeDto>('/org/tree', { view: params.view, asCompany: params.asCompany }) });

/** The unit types and the «who may be created under whom» table. */
export const useOrgLevels = (enabled = true) => useQuery({ queryKey: ['org', 'levels'], enabled, queryFn: () => apiClient.get<OrgLevelsDto>('/org/levels') });

function useOrgMutation<TIn, TOut>(fn: (input: TIn) => Promise<TOut>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    // Structure changes can move employees and change the lists that depend on it.
    onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: ['org'] }), client.invalidateQueries({ queryKey: ['lookups'] }), client.invalidateQueries({ queryKey: ['employees'] })]),
  });
}

export const useSaveLevels = () => useOrgMutation((input: SaveOrgLevelsInput) => apiClient.put<OrgLevelsDto>('/org/levels', input));
export const useSaveLevelRules = () => useOrgMutation((input: SaveOrgLevelRulesInput) => apiClient.put<OrgLevelsDto>('/org/levels/rules', input));
export const useCreateNode = () => useOrgMutation((input: CreateOrgNodeInput) => apiClient.post<OrgNodeDto>('/org/nodes', input));
export const useUpdateNode = (id: string) => useOrgMutation((input: UpdateOrgNodeInput) => apiClient.put<OrgNodeDto>(`/org/nodes/${id}`, input));
export const useSetNodeCode = (id: string) => useOrgMutation((input: SetOrgNodeCodeInput) => apiClient.put<OrgNodeDto>(`/org/nodes/${id}/code`, input));
export const useMoveNode = (id: string) => useOrgMutation((input: MoveOrgNodeInput) => apiClient.post<OrgNodeDto>(`/org/nodes/${id}/move`, input));
export const useChangeMode = (id: string) => useOrgMutation((input: ChangeManagementModeInput) => apiClient.post<ChangeManagementModeResultDto>(`/org/nodes/${id}/management-mode`, input));
export const useDeleteNode = () => useOrgMutation((id: string) => apiClient.delete(`/org/nodes/${id}`));

/** The dated versions of a unit (past, current, scheduled) and its change log. */
export const useNodeVersions = (id: string, enabled = true) => useQuery({ queryKey: ['org', 'versions', id], enabled, queryFn: () => apiClient.get<OrgNodeVersionsDto>(`/org/nodes/${id}/versions`) });

/** The unit's leaders and acting leaders per company, and where the manager goes when a company has none. */
export const useNodeLeaders = (id: string, enabled = true) => useQuery({ queryKey: ['org', 'leaders', id], enabled, queryFn: () => apiClient.get<OrgNodeLeadersDto>(`/org/nodes/${id}/leaders`) });

export const useUpdateCharter = (id: string) => useOrgMutation((input: UpdateCharterInput) => apiClient.put<OrgNodeVersionsDto>(`/org/nodes/${id}/charter`, input));
export const useSetLeader = (id: string) => useOrgMutation((input: SetLeaderInput) => apiClient.put<OrgNodeLeadersDto>(`/org/nodes/${id}/leaders`, input));
export const useEndLeader = (id: string) => useOrgMutation(({ leaderId, ...input }: EndLeaderInput & { leaderId: string }) => apiClient.post<OrgNodeLeadersDto>(`/org/nodes/${id}/leaders/${leaderId}/end`, input));
export const useRemoveLeader = (id: string) => useOrgMutation((leaderId: string) => apiClient.delete(`/org/nodes/${id}/leaders/${leaderId}`));

/** Employees of one company found by name or number from the first letter: who may lead a unit for that company. */
export const useCompanyEmployees = (companyId: string | null, search: string) =>
  useQuery({
    queryKey: ['employees', 'of-company', companyId, search],
    enabled: !!companyId,
    queryFn: () => apiClient.get<Paginated<EmployeeListItemDto>>('/employees', { companyId: companyId ?? undefined, search: search || undefined, status: 'active', pageSize: 20 }),
    placeholderData: keepPreviousData,
  });
