import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/core/api/api-client';
import { FilePreviewDialog } from '@/shared/ui';
import type { ChatFile } from './chat-file';

/** The bytes of a picture of the conversation, read with the person's session (never a bare `<img src>`); an object URL kept until the page goes. */
function useChatImageUrl(file: ChatFile): string | null {
  const { data } = useQuery({
    queryKey: ['agent-file', file.id],
    queryFn: async () => URL.createObjectURL(await apiClient.blob(`/agent/files/${file.id}/preview`)),
    enabled: !file.localUrl,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
  return file.localUrl ?? data ?? null;
}

/** A small picture of the conversation; a click opens it in the preview window. */
export function ChatImage({ file, className = 'size-20' }: { file: ChatFile; className?: string }) {
  const { t } = useTranslation('agentChat');
  const url = useChatImageUrl(file);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" aria-label={t('images.open', { name: file.name })} onClick={() => setOpen(true)} className={`${className} shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-link/15`}>
        {url && <img src={url} alt={file.name} className="size-full object-cover" />}
      </button>
      {open && <FilePreviewDialog file={{ name: file.name, contentType: file.contentType, previewPath: `/agent/files/${file.id}/preview`, downloadUrl: `/api/agent/files/${file.id}/content` }} onClose={() => setOpen(false)} />}
    </>
  );
}
