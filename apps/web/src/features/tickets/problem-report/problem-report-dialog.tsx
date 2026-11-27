import type { ProblemContext } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Dialog, DialogToolsProvider, ZoomableImage } from '@/shared/ui';
import { ProblemReportFields } from './problem-report-fields';
import { useBlobUrl } from './use-blob-url';
import { useProblemReportFlow } from './use-problem-report-flow';

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
  /** The «Analyse with the AI» button shows. */
  canAnalyze: boolean;
  onClose: () => void;
}

/** The report: the screenshot, a title and a description (written by hand or by the AI, always changeable), and what will be sent with them; sending makes a ticket. */
export function ProblemReportDialog({ screenshot, context, imageToAi, canAnalyze, onClose }: Props) {
  const { t } = useTranslation('tickets');
  const { t: tc } = useTranslation();
  const flow = useProblemReportFlow(screenshot, context, onClose);
  const url = useBlobUrl(screenshot);
  return (
    <DialogToolsProvider value={null}>
    <Dialog open onOpenChange={(open) => !open && onClose()} title={t('problemReport.title')} description={t('problemReport.description')} wide>
      <div className="flex flex-col gap-4">
        {flow.failure && <Alert>{errorMessage(tc, flow.failure)}</Alert>}
        {url ? <ScreenshotPreview url={url} attach={flow.attach} onAttach={flow.setAttach} imageToAi={imageToAi} /> : <Alert tone="info">{t('problemReport.noScreenshot')}</Alert>}
        <ProblemReportFields title={flow.title} note={flow.note} onTitle={flow.setTitle} onNote={flow.setNote} canAnalyze={canAnalyze} analyzing={flow.analyzing} onAnalyze={() => void flow.analyze()} read={flow.read} seesPicture={imageToAi && flow.attach && screenshot !== null} />
        <p className="text-sm text-muted">{t('problemReport.willSend', { page: context.pageTitle || context.path })}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button disabled={flow.busy} onClick={() => void flow.submit()}>{flow.sending ? t('problemReport.sending') : t('problemReport.send')}</Button>
        </div>
      </div>
    </Dialog>
    </DialogToolsProvider>
  );
}
