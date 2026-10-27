import type { IntegrationCatalogDto, IntegrationKind, ProviderDto, ProviderValue, TestResultDto } from '@arweqah-platform/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';

const KEY = 'integrations';
const path = (kind: IntegrationKind, rest = '') => `/integrations/${kind}${rest}`;

export type SentValues = Record<string, ProviderValue | null>;

export const useProviders = (kind: IntegrationKind) => useQuery({ queryKey: [KEY, kind], queryFn: () => apiClient.get<IntegrationCatalogDto>(path(kind)) });

/** Every change (and every passed test) refreshes the list, since a test marks the data as tried. */
function useProviderMutation<TIn, TOut>(kind: IntegrationKind, fn: (input: TIn) => Promise<TOut>) {
  const client = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => client.invalidateQueries({ queryKey: [KEY, kind] }) });
}

export const useSaveProvider = (kind: IntegrationKind) =>
  useProviderMutation(kind, ({ providerKey, values }: { providerKey: string; values: SentValues }) => apiClient.put<ProviderDto>(path(kind, `/${providerKey}`), { values }));

export const useTestProvider = (kind: IntegrationKind) =>
  useProviderMutation(kind, ({ providerKey, ...body }: { providerKey: string; values?: SentValues; text?: string; to?: string }) => apiClient.post<TestResultDto>(path(kind, `/${providerKey}/test`), body));

export const useActivateProvider = (kind: IntegrationKind) => useProviderMutation(kind, (providerKey: string) => apiClient.post<IntegrationCatalogDto>(path(kind, `/${providerKey}/activate`)));

export const useDeactivateProvider = (kind: IntegrationKind) => useProviderMutation(kind, () => apiClient.post<IntegrationCatalogDto>(path(kind, '/deactivate')));
