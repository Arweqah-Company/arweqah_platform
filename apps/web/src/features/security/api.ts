import type { SecuritySettingsDto, SecuritySettingsInput, SessionDto, TrustedDeviceDto } from '@arweqah-platform/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';

const SESSIONS = ['my-sessions'];
const DEVICES = ['my-trusted-devices'];
const SETTINGS = ['security-settings'];

export const useSessions = () => useQuery({ queryKey: SESSIONS, queryFn: () => apiClient.get<SessionDto[]>('/me/sessions') });
export const useTrustedDevices = () => useQuery({ queryKey: DEVICES, queryFn: () => apiClient.get<TrustedDeviceDto[]>('/me/trusted-devices') });
export const useSecuritySettings = () => useQuery({ queryKey: SETTINGS, queryFn: () => apiClient.get<SecuritySettingsDto>('/security-settings') });

function useChange<T>(key: string[], change: (input: T) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({ mutationFn: change, onSuccess: () => client.invalidateQueries({ queryKey: key }) });
}

export const useEndSession = () => useChange<string>(SESSIONS, (id) => apiClient.delete(`/me/sessions/${id}`));
export const useEndOtherSessions = () => useChange<void>(SESSIONS, () => apiClient.delete('/me/sessions'));
export const useRemoveTrustedDevice = () => useChange<string>(DEVICES, (id) => apiClient.delete(`/me/trusted-devices/${id}`));
export const useSaveSecuritySettings = () => useChange<SecuritySettingsInput>(SETTINGS, (input) => apiClient.put<SecuritySettingsDto>('/security-settings', input));
