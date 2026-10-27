import type { SaveTemplateInput, TemplateCatalogDto, TemplateContent, TemplateDto, TemplateKind, TemplateLang, TemplatePreviewDto } from '@arweqah-platform/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';

const KEY = 'templates';
const path = (kind: TemplateKind, rest = '') => `/templates/${kind}${rest}`;

export const useTemplates = (kind: TemplateKind) => useQuery({ queryKey: [KEY, kind], queryFn: () => apiClient.get<TemplateCatalogDto>(path(kind)) });

/** Every change refreshes the list: a save may become a pending change, an approval makes it live. */
function useTemplateMutation<TIn, TOut>(kind: TemplateKind, fn: (input: TIn) => Promise<TOut>) {
  const client = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => client.invalidateQueries({ queryKey: [KEY, kind] }) });
}

export const useSaveTemplate = (kind: TemplateKind) =>
  useTemplateMutation(kind, ({ key, content }: { key: string } & SaveTemplateInput) => apiClient.put<TemplateDto>(path(kind, `/${key}`), { content }));

export const useResetTemplate = (kind: TemplateKind) => useTemplateMutation(kind, (key: string) => apiClient.post<TemplateDto>(path(kind, `/${key}/reset`)));

export const useApproveTemplate = (kind: TemplateKind) => useTemplateMutation(kind, (key: string) => apiClient.post<TemplateDto>(path(kind, `/${key}/approve`)));

export const useRejectTemplate = (kind: TemplateKind) => useTemplateMutation(kind, ({ key, note }: { key: string; note: string }) => apiClient.post<TemplateDto>(path(kind, `/${key}/reject`), { note }));

export const useRequireApproval = (kind: TemplateKind) => useTemplateMutation(kind, (requireApproval: boolean) => apiClient.put<TemplateCatalogDto>(path(kind, '/settings'), { requireApproval }));

export const useSendTemplateTest = () => useMutation({ mutationFn: ({ key, content, lang }: { key: string; content: TemplateContent; lang: TemplateLang }) => apiClient.post<{ sentTo: string }>(path('email', `/${key}/test`), { content, lang }) });

/** The preview of the wording being edited, after a short pause in typing (a problem such as an unknown variable comes back as the error). */
export function useTemplatePreview(kind: TemplateKind, key: string, content: TemplateContent, lang: TemplateLang) {
  const text = JSON.stringify({ content, lang });
  return useQuery({
    queryKey: [KEY, kind, key, 'preview', text],
    queryFn: () => apiClient.post<TemplatePreviewDto>(path(kind, `/${key}/preview`), { content, lang }),
    retry: false,
    placeholderData: (previous) => previous,
  });
}
