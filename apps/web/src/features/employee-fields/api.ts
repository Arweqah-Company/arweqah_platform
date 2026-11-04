import type { EmployeeFieldRuleDto, UpdateFieldRulesInput } from '@arweqah-platform/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';

const KEY = ['employee-fields'];

export const useFieldRules = () => useQuery({ queryKey: KEY, queryFn: () => apiClient.get<EmployeeFieldRuleDto[]>('/employee-fields') });

/** Saving changes who may edit a field at once, so the employee form's lock list is read again too. */
export function useSaveFieldRules() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateFieldRulesInput) => apiClient.put<EmployeeFieldRuleDto[]>('/employee-fields', input),
    onSuccess: (rules) => Promise.all([client.setQueryData(KEY, rules), client.invalidateQueries({ queryKey: ['employees'] })]),
  });
}
