import type { OrgTreeDto, UpsertBranchInput, UpsertDepartmentInput, UpsertTeamInput } from '@arweqah-platform/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';

const KEY = ['org-tree'];
export type OrgUnitKind = 'branch' | 'department' | 'team';

export const useOrgTree = () => useQuery({ queryKey: KEY, queryFn: () => apiClient.get<OrgTreeDto>('/org/tree') });

type SaveUnit =
  | { kind: 'branch'; input: UpsertBranchInput }
  | { kind: 'department'; input: UpsertDepartmentInput }
  | { kind: 'team'; input: UpsertTeamInput };

const PATHS: Record<OrgUnitKind, string> = { branch: '/org/branches', department: '/org/departments', team: '/org/teams' };

export function useSaveOrgUnit() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (unit: SaveUnit) => apiClient.post(PATHS[unit.kind], unit.input),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteOrgUnit() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, id }: { kind: OrgUnitKind; id: string }) => apiClient.delete(`/org/${kind}/${id}`),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}
