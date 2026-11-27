import type { CreateProblemReportInput, FileDto, ProblemReportAvailabilityDto, ProblemReportResultDto, ProblemReportSettingsDto, ProblemReportSettingsInput, ProblemReportTypeOptionDto } from '@arweqah-platform/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';

const KEY = 'problem-reports';

/** Does the «report a problem» button show now (it is on and a ticket type is chosen). Asked only for a person who holds the key. */
export const useProblemReportAvailability = (enabled: boolean) =>
  useQuery({ queryKey: [KEY, 'availability'], enabled, staleTime: 60_000, queryFn: () => apiClient.get<ProblemReportAvailabilityDto>('/problem-reports/availability') });

interface SendInput {
  note: string;
  context: CreateProblemReportInput['context'];
  /** The screenshot, or null to send the text alone. */
  screenshot: Blob | null;
}

/** The screenshot is stored first (like any attachment), then the report names it. */
async function send({ note, context, screenshot }: SendInput): Promise<ProblemReportResultDto> {
  let fileId: string | undefined;
  if (screenshot) {
    const form = new FormData();
    form.append('file', new File([screenshot], 'screenshot.jpg', { type: screenshot.type || 'image/jpeg' }));
    fileId = (await apiClient.post<FileDto>('/files', form)).id;
  }
  return apiClient.post<ProblemReportResultDto>('/problem-reports', { note, fileId, context });
}

export function useSendProblemReport() {
  const client = useQueryClient();
  return useMutation({ mutationFn: send, onSuccess: () => client.invalidateQueries({ queryKey: ['tickets'] }) });
}

export const useProblemReportSettings = () => useQuery({ queryKey: [KEY, 'settings'], queryFn: () => apiClient.get<ProblemReportSettingsDto>('/problem-report-settings') });

export const useProblemReportTypes = () => useQuery({ queryKey: [KEY, 'types'], queryFn: () => apiClient.get<ProblemReportTypeOptionDto[]>('/problem-report-settings/types') });

/** Saving also refreshes the button's availability for this browser. */
export function useSaveProblemReportSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: ProblemReportSettingsInput) => apiClient.put<ProblemReportSettingsDto>('/problem-report-settings', input),
    onSuccess: () => client.invalidateQueries({ queryKey: [KEY] }),
  });
}
