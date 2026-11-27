import type { AllowedEmailDomainsDto, SecuritySettingsDto, SecuritySettingsInput, SessionDto, TrustedDeviceDto } from '@arweqah-platform/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';
import { ME_KEY } from '@/core/auth/session';

const SESSIONS = ['my-sessions'];
const DEVICES = ['my-trusted-devices'];
const SETTINGS = ['security-settings'];
const DOMAINS = ['security-email-domains'];

export const useSessions = () => useQuery({ queryKey: SESSIONS, queryFn: () => apiClient.get<SessionDto[]>('/me/sessions') });
export const useTrustedDevices = () => useQuery({ queryKey: DEVICES, queryFn: () => apiClient.get<TrustedDeviceDto[]>('/me/trusted-devices') });
export const useSecuritySettings = () => useQuery({ queryKey: SETTINGS, queryFn: () => apiClient.get<SecuritySettingsDto>('/security-settings') });

function useChange<T>(key: string[], change: (input: T) => Promise<unknown>, also: string[][] = []) {
  const client = useQueryClient();
  return useMutation({ mutationFn: change, onSuccess: () => Promise.all([key, ...also].map((queryKey) => client.invalidateQueries({ queryKey }))) });
}

export const useEndSession = () => useChange<string>(SESSIONS, (id) => apiClient.delete(`/me/sessions/${id}`));
export const useEndOtherSessions = () => useChange<void>(SESSIONS, () => apiClient.delete('/me/sessions'));
export const useRemoveTrustedDevice = () => useChange<string>(DEVICES, (id) => apiClient.delete(`/me/trusted-devices/${id}`));
/** Saving also refreshes the signed-in person: `/me` carries the largest attachment, which every file box reads. */
export const useSaveSecuritySettings = () => useChange<SecuritySettingsInput>(SETTINGS, (input) => apiClient.put<SecuritySettingsDto>('/security-settings', input), [ME_KEY]);
export const useEmailDomains = () => useQuery({ queryKey: DOMAINS, queryFn: () => apiClient.get<AllowedEmailDomainsDto>('/security-settings/email-domains') });
export const useSaveEmailDomains = () => useChange<string[]>(DOMAINS, (domains) => apiClient.put<AllowedEmailDomainsDto>('/security-settings/email-domains', { domains }));
