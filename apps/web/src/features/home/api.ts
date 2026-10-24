import type { TicketSummaryDto } from '@arweqah-platform/shared';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';

/** The person's own tickets in numbers: what they sent, and what waits for them. */
export const useTicketSummary = (enabled: boolean) =>
  useQuery({ queryKey: ['tickets', 'mine-summary'], enabled, staleTime: 60_000, queryFn: () => apiClient.get<TicketSummaryDto>('/tickets/mine-summary') });
