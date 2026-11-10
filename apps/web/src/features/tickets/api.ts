import type {
  CreateTicketInput,
  PersonRefDto,
  TicketCatalogDto,
  TicketDeskDto,
  TicketDeskSettingsInput,
  TicketDto,
  TicketFilterOptionsDto,
  TicketFiguresDto,
  TicketReplyInput,
  TicketTypeDto,
  TicketTypeInput,
} from '@arweqah-platform/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';

const KEY = 'tickets';

/** What the "new ticket" form offers: departments, their types, usual durations. */
export const useTicketCatalog = (enabled = true) => useQuery({ queryKey: [KEY, 'catalog'], enabled, queryFn: () => apiClient.get<TicketCatalogDto>('/tickets/catalog'), staleTime: 30_000 });

export const useTicketOptions = () => useQuery({ queryKey: [KEY, 'options'], queryFn: () => apiClient.get<TicketFilterOptionsDto>('/tickets/options') });

/** The @ list of a ticket's reply box: people matching what was typed after the @ (only while the list is open). */
export const useTicketMentionables = (ticketId: string, search: string, enabled: boolean) =>
  useQuery({ queryKey: [KEY, 'mentionables', ticketId, search], enabled, staleTime: 30_000, queryFn: () => apiClient.get<PersonRefDto[]>(`/tickets/${ticketId}/mentionables`, { search }) });

export const useTicket = (id: string | undefined) => useQuery({ queryKey: [KEY, 'one', id], enabled: !!id, queryFn: () => apiClient.get<TicketDto>(`/tickets/${id}`) });

/** Every change refreshes the lists, the open ticket and the figures. */
function useTicketMutation<TIn, TOut>(fn: (input: TIn) => Promise<TOut>) {
  const client = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => client.invalidateQueries({ queryKey: [KEY] }) });
}

export const useCreateTicket = () => useTicketMutation((input: CreateTicketInput) => apiClient.post<TicketDto>('/tickets', input));
export const useTicketReply = (id: string) => useTicketMutation((input: TicketReplyInput) => apiClient.post<TicketDto>(`/tickets/${id}/replies`, input));

export type TicketAction = 'request-close' | 'confirm-close' | 'decline-close' | 'close-without-execution' | 'reopen';
export const useTicketAction = (id: string) => useTicketMutation((input: { action: TicketAction; message?: string }) => apiClient.post<TicketDto>(`/tickets/${id}/${input.action}`, { message: input.message || undefined }));

// ------------------------------------------------------------------ setup (admin mode)

export const useSetupDesks = (enabled: boolean) => useQuery({ queryKey: [KEY, 'setup'], enabled, queryFn: () => apiClient.get<TicketDeskDto[]>('/tickets/setup/desks') });

export const useSaveDesk = (deskId: string) => useTicketMutation((input: TicketDeskSettingsInput) => apiClient.put<TicketDeskDto>(`/tickets/setup/desks/${deskId}`, input));

export const useSaveType = (deskId: string) =>
  useTicketMutation((input: { typeId?: string; values: TicketTypeInput }) =>
    input.typeId ? apiClient.put<TicketTypeDto>(`/tickets/setup/desks/${deskId}/types/${input.typeId}`, input.values) : apiClient.post<TicketTypeDto>(`/tickets/setup/desks/${deskId}/types`, input.values),
  );

export const useRemoveType = (deskId: string) => useTicketMutation((typeId: string) => apiClient.request<{ deleted: boolean }>(`/tickets/setup/desks/${deskId}/types/${typeId}`, { method: 'DELETE' }));

export const useAssignees = (deskId: string, search: string) =>
  useQuery({ queryKey: [KEY, 'assignees', deskId, search], queryFn: () => apiClient.get<PersonRefDto[]>(`/tickets/setup/desks/${deskId}/assignees`, { q: search }), placeholderData: keepPreviousData });

/** The figures of one department, or of all of them added up (no `deskId`); the last answer stays while the next one loads. */
export const useFigures = (enabled: boolean, deskId: string) =>
  useQuery({ queryKey: [KEY, 'figures', deskId], enabled, placeholderData: keepPreviousData, queryFn: () => apiClient.get<TicketFiguresDto>(`/tickets/figures${deskId ? `?deskId=${deskId}` : ''}`) });
