import { formatTicketNumber, type ProblemContext, type ProblemReportAnalysisDto } from '@arweqah-platform/shared';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAnalyzeProblemReport, useSendProblemReport, useUploadScreenshot } from './api';

/** The stored screenshot to name in the analysis and the report: uploaded once, on the first need, and only while the person keeps it. */
function useKeptScreenshot(screenshot: Blob | null, attach: boolean) {
  const [fileId, setFileId] = useState<string | null>(null);
  const upload = useUploadScreenshot();
  const latest = useRef(attach);
  useEffect(() => {
    latest.current = attach;
  }, [attach]);
  const kept = async (): Promise<string | undefined> => {
    if (!attach || !screenshot) return undefined;
    const stored = fileId ?? (await upload.mutateAsync(screenshot));
    setFileId(stored);
    return latest.current ? stored : undefined; // unticked while it was uploading: it is not named, so it goes nowhere
  };
  return { kept, upload };
}

/** The state and the two actions of the report window: ask the AI to write, and send. */
export function useProblemReportFlow(screenshot: Blob | null, context: ProblemContext, onClose: () => void) {
  const { t } = useTranslation('tickets');
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [attach, setAttach] = useState(screenshot !== null);
  const [read, setRead] = useState<ProblemReportAnalysisDto | null>(null);
  const send = useSendProblemReport();
  const ai = useAnalyzeProblemReport();
  const { kept, upload } = useKeptScreenshot(screenshot, attach);
  const analyze = async () => {
    try {
      const result = await ai.mutateAsync({ note: note.trim(), context, fileId: await kept() });
      setTitle(result.title);
      setNote(result.description);
      setRead(result);
    } catch {
      /* shown in the dialog */
    }
  };
  const submit = async () => {
    try {
      const result = await send.mutateAsync({ title: title.trim(), note: note.trim(), context, fileId: await kept(), analyzed: read !== null });
      toast.success(t('problemReport.sent', { number: formatTicketNumber(result.ticketNumber) }), { action: { label: t('problemReport.openTicket'), onClick: () => void navigate(`/tickets/${result.ticketId}`) } });
      onClose();
    } catch {
      /* shown in the dialog */
    }
  };
  return {
    title, setTitle, note, setNote, attach, setAttach, read, analyze, submit,
    failure: send.error ?? ai.error ?? upload.error,
    busy: send.isPending || ai.isPending || upload.isPending,
    analyzing: ai.isPending || upload.isPending,
    sending: send.isPending,
  };
}
