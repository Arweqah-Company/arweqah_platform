import { useQuery } from '@tanstack/react-query';
import { apiClient } from './api-client';

export interface CompanyOption {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
}

/** The companies a person may pick (company selects across the app). */
export const useCompanyOptions = () =>
  useQuery({ queryKey: ['lookups', 'companies'], queryFn: () => apiClient.get<CompanyOption[]>('/lookups/companies'), staleTime: 5 * 60_000 });
