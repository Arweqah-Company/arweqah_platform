import type {
  CreateEmployeeInput,
  CreateEmployeeResultDto,
  EmployeeDto,
  EmployeesSummaryDto,
  InviteResultDto,
  JobTitleOptionDto,
  LookupsDto,
  ManagerOptionDto,
  OrgNodeOptionDto,
  OrgReferenceDto,
  TerminateEmployeeInput,
  UpdateEmployeeInput,
} from '@arweqah-platform/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { refreshAccess } from '@/core/permissions/access-key';
import { apiClient } from '@/core/api/api-client';
export { useCompanyOptions } from '@/core/api/lookups';

const lang = (i18nLanguage: string) => (i18nLanguage === 'en' ? 'en' : 'ar');
const STATIC = { staleTime: 5 * 60_000 };

export const useEmployee = (id: string | undefined) =>
  useQuery({ queryKey: ['employees', 'one', id], enabled: !!id, queryFn: () => apiClient.get<EmployeeDto>(`/employees/${id}`) });

export const useEmployeesSummary = (enabled: boolean) =>
  useQuery({ queryKey: ['employees', 'summary'], enabled, queryFn: () => apiClient.get<EmployeesSummaryDto>('/employees/summary') });

/** Seeded option lists with flags and ID rules; the form is built from this, not from fixed lists. */
export function useLookups() {
  const { i18n } = useTranslation();
  return useQuery({ queryKey: ['lookups', lang(i18n.language)], queryFn: () => apiClient.get<LookupsDto>('/lookups'), ...STATIC });
}

export const useOrgNodeOptions = (companyId: string | undefined) =>
  useQuery({ queryKey: ['lookups', 'org-nodes', companyId], enabled: !!companyId, queryFn: () => apiClient.get<OrgNodeOptionDto[]>('/lookups/org-nodes', { companyId }) });

/** Every company's units and job titles in one call (import template drop-downs and mapping). */
export const useOrgReference = (enabled: boolean) => useQuery({ queryKey: ['lookups', 'org-reference'], enabled, queryFn: () => apiClient.get<OrgReferenceDto[]>('/lookups/org-reference'), staleTime: 60_000 });

export const useJobTitleOptions = (orgNodeId: string | undefined) =>
  useQuery({ queryKey: ['lookups', 'job-titles', orgNodeId], enabled: !!orgNodeId, queryFn: () => apiClient.get<JobTitleOptionDto[]>('/lookups/job-titles', { orgNodeId }) });

/** `enabled` is false for a person whose manager field is locked: the list of the whole company is not theirs to read. */
export const useManagerSearch = (search: string, excludeId?: string, enabled = true) =>
  useQuery({ queryKey: ['employees', 'managers', search, excludeId], enabled, queryFn: () => apiClient.get<ManagerOptionDto[]>('/employees/managers', { search, excludeId }), placeholderData: keepPreviousData });

/** `changesAccess`: roles or groups were given or taken, which may be the signed-in person's own, so their permissions are read again. */
function useEmployeeMutation<TIn, TOut>(fn: (input: TIn) => Promise<TOut>, changesAccess = false) {
  const client = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: ['employees'] }), changesAccess ? refreshAccess(client) : undefined]) });
}

export const useCreateEmployee = () => useEmployeeMutation((input: CreateEmployeeInput) => apiClient.post<CreateEmployeeResultDto>('/employees', input));
export const useUpdateEmployee = (id: string) => useEmployeeMutation((input: UpdateEmployeeInput) => apiClient.put<EmployeeDto>(`/employees/${id}`, input));
export const useSetActive = (id: string) => useEmployeeMutation((active: boolean) => apiClient.post<EmployeeDto>(`/employees/${id}/${active ? 'activate' : 'deactivate'}`));
export const useTerminate = (id: string) => useEmployeeMutation((input: TerminateEmployeeInput) => apiClient.post<EmployeeDto>(`/employees/${id}/terminate`, input));
export const useAssignGroups = (id: string) => useEmployeeMutation((groupIds: string[]) => apiClient.put<EmployeeDto>(`/employees/${id}/groups`, { groupIds }), true);

/** The groups of roles to choose from (HR does not need the admin page for this). */
export const useRoleGroupOptions = () => useQuery({ queryKey: ['lookups', 'role-groups'], queryFn: () => apiClient.get<{ id: string; nameAr: string; nameEn: string }[]>('/lookups/role-groups') });

export const useAssignRoles = (id: string) =>
  useEmployeeMutation((input: { roleIds: string[]; roleExpiries?: Record<string, string | null> }) => apiClient.put<EmployeeDto>(`/employees/${id}/roles`, input), true);
export const useResendInvite = (id: string) => useEmployeeMutation(() => apiClient.post<InviteResultDto>(`/employees/${id}/resend-invite`));
export const useResetAuthenticator = (id: string) => useEmployeeMutation(() => apiClient.post<InviteResultDto>(`/employees/${id}/reset-authenticator`));
