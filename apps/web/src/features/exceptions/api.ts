import type { AccessExceptionDto, ExceptionRef } from '@arweqah-platform/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';

const KEY = ['access-exceptions'];
const path = (ref: ExceptionRef) => `/access/exceptions/${ref.kind}/${ref.userId}/${encodeURIComponent(ref.targetId)}`;

export const useExceptions = () => useQuery({ queryKey: KEY, queryFn: () => apiClient.get<AccessExceptionDto[]>('/access/exceptions') });

function useChange<T>(change: (input: T) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({ mutationFn: change, onSuccess: () => client.invalidateQueries({ queryKey: KEY }) });
}

export const useSetExpiry = () => useChange(({ ref, expiresAt }: { ref: ExceptionRef; expiresAt: string | null }) => apiClient.put(path(ref), { expiresAt }));
export const useRevokeException = () => useChange((ref: ExceptionRef) => apiClient.delete(path(ref)));
