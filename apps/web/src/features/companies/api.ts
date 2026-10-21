import type { CompanyDto, UpsertCompanyInput } from '@arweqah-platform/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';

export const useCompanies = () => useQuery({ queryKey: ['companies'], queryFn: () => apiClient.get<CompanyDto[]>('/companies') });

function useCompanyMutation<TIn, TOut>(fn: (input: TIn) => Promise<TOut>) {
  const client = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: ['companies'] }), client.invalidateQueries({ queryKey: ['lookups'] }), client.invalidateQueries({ queryKey: ['org'] })]) });
}

export const useSaveCompany = () => useCompanyMutation(({ id, ...input }: UpsertCompanyInput & { id?: string }) => (id ? apiClient.put<CompanyDto>(`/companies/${id}`, input) : apiClient.post<CompanyDto>('/companies', input)));
export const useDeleteCompany = () => useCompanyMutation((id: string) => apiClient.delete(`/companies/${id}`));
