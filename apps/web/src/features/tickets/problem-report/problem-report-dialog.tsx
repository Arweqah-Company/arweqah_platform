import { formatTicketNumber, MAX_PROBLEM_NOTE, type ProblemContext } from '@arweqah-platform/shared';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Dialog, DialogToolsProvider, FormField, Textarea, ZoomableImage } from '@/shared/ui';
import { useSendProblemReport } from './api';

/** An object URL for a picture the browser holds, released when the picture goes. */
function useBlobUrl(blob: Blob | null): string | null {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return url;
}

interface PreviewProps {
  url: string;
  attach: boolean;
  onAttach: (attach: boolean) => void;
  imageToAi: boolean;
}

/** The screenshot as a thumbnail (a click opens it full size), with the choice to keep it or send the report as text alone. */
function ScreenshotPreview({ url, attach, onAttach, imageToAi }: PreviewProps) {
  const { t } = useTranslation('tickets');
  const [zoomed, setZoomed] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <button type="button" className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2" aria-label={t('problemReport.viewFull')} onClick={() => setZoomed(true)}>
        <img src={url} alt={t('problemReport.screenshotAlt')} className={attach ? 'max-h-56 w-full object-contain' : 'max-h-56 w-full object-contain opacity-40'} />
      </button>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-0.5 size-5 accent-petrol-800" checked={attach} onChange={(e) => onAttach(e.target.checked)} />
        <span>
          <span className="block font-medium text-fg">{t('problemReport.attach')}</span>
          <span className="block text-muted">{t('problemReport.attachHint')}</span>
        </span>
      </label>
      {attach && imageToAi && <Alert tone="warning">{t('problemReport.imageToAi')}</Alert>}
      {zoomed && (
        <Dialog open onOpenChange={(open) => !open && setZoomed(false)} title={t('problemReport.screenshotAlt')} xl>
          <ZoomableImage src={url} name={t('problemReport.screenshotAlt')} />
        </Dialog>
      )}
    </div>
  );
}

interface Props {
  /** The picture taken when the button was pressed; null when the browser could not draw the page. */
  screenshot: Blob | null;
  context: ProblemContext;
  /** The administrator lets the AI service see the picture. */
  imageToAi: boolean;
  onClose: () => void;
}

/** The report: the screenshot, a line from the person, and what will be sent with them; sending makes a ticket. */
export function ProblemReportDialog({ screenshot, context, imageToAi, onClose }: Props) {
  const { t } = useTranslation('tickets');
  const { t: tc } = useTranslation();
  const navigate = useNavigate();
  const [note, setNote] = useState('');
  const [attach, setAttach] = useState(screenshot !== null);
  const url = useBlobUrl(screenshot);
  const send = useSendProblemReport();
  const submit = async () => {
    try {
      const result = await send.mutateAsync({ note: note.trim(), context, screenshot: attach ? screenshot : null });
      toast.success(t('problemReport.sent', { number: formatTicketNumber(result.ticketNumber) }), { action: { label: t('problemReport.openTicket'), onClick: () => void navigate(`/tickets/${result.ticketId}`) } });
      onClose();
    } catch {
      /* shown in the dialog */
    }
  };
  return (
    <DialogToolsProvider value={null}>
    <Dialog open onOpenChange={(open) => !open && onClose()} title={t('problemReport.title')} description={t('problemReport.description')} wide>
      <div className="flex flex-col gap-4">
        {send.isError && <Alert>{errorMessage(tc, send.error)}</Alert>}
        {url ? <ScreenshotPreview url={url} attach={attach} onAttach={setAttach} imageToAi={imageToAi} /> : <Alert tone="info">{t('problemReport.noScreenshot')}</Alert>}
        <FormField label={t('problemReport.note')} hint={t('problemReport.noteHint')}>
          {(p) => <Textarea {...p} rows={3} maxLength={MAX_PROBLEM_NOTE} value={note} onChange={(e) => setNote(e.target.value)} />}
        </FormField>
        <p className="text-sm text-muted">{t('problemReport.willSend', { page: context.pageTitle || context.path })}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button disabled={send.isPending} onClick={() => void submit()}>{send.isPending ? t('problemReport.sending') : t('problemReport.send')}</Button>
        </div>
      </div>
    </Dialog>
    </DialogToolsProvider>
  );
}
