import type { AnalyzeProblemReportInput, CreateProblemReportInput, FileDto, ProblemReportAnalysisDto, ProblemReportAvailabilityDto, ProblemReportResultDto, ProblemReportSettingsDto, ProblemReportSettingsInput, ProblemReportTypeOptionDto } from '@arweqah-platform/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';

const KEY = 'problem-reports';

/** Does the «report a problem» button show now (it is on and a ticket type is chosen). Asked only for a person who holds the key. */
export const useProblemReportAvailability = (enabled: boolean) =>
  useQuery({ queryKey: [KEY, 'availability'], enabled, staleTime: 60_000, queryFn: () => apiClient.get<ProblemReportAvailabilityDto>('/problem-reports/availability') });

/** The screenshot is stored first (like any attachment); the analysis and the report then name it. */
async function uploadScreenshot(screenshot: Blob): Promise<string> {
  const form = new FormData();
  form.append('file', new File([screenshot], 'screenshot.jpg', { type: screenshot.type || 'image/jpeg' }));
  return (await apiClient.post<FileDto>('/files', form)).id;
}

export const useUploadScreenshot = () => useMutation({ mutationFn: uploadScreenshot });

/** The AI reads the screen's details, the note so far and the screenshot (when kept and allowed) and writes a title and a description. */
export const useAnalyzeProblemReport = () =>
  useMutation({ mutationFn: (input: AnalyzeProblemReportInput) => apiClient.post<ProblemReportAnalysisDto>('/problem-reports/analyze', input) });

export function useSendProblemReport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProblemReportInput) => apiClient.post<ProblemReportResultDto>('/problem-reports', input),
    onSuccess: () => client.invalidateQueries({ queryKey: ['tickets'] }),
  });
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
