import { CorePermission, type ProblemContext } from '@arweqah-platform/shared';
import { Bug } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/core/permissions/can';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui';
import { useProblemReportAvailability } from './api';
import { captureScreenshot } from './capture-screenshot';
import { buildProblemContext } from './problem-context';
import { ProblemReportDialog } from './problem-report-dialog';

interface Opened {
  screenshot: Blob | null;
  context: ProblemContext;
}

/** The round «Report a problem» button of the corner tools (beside the assistant): takes a picture of the screen and the details of the page, then opens the report. Shown only while reports are on and the person holds the key. `inDialog` is the copy a pop-up window carries in the same corner. */
export function ProblemReportButton({ inDialog = false }: { inDialog?: boolean }) {
  const { t, i18n } = useTranslation('tickets');
  const allowed = usePermissions().can(CorePermission.TicketsReportProblem);
  const availability = useProblemReportAvailability(allowed);
  const [opened, setOpened] = useState<Opened | null>(null);
  const [busy, setBusy] = useState(false);
  if (!allowed || !availability.data?.available) return null;
  const open = async () => {
    setBusy(true);
    const context = buildProblemContext(i18n.language);
    setOpened({ screenshot: await captureScreenshot(), context });
    setBusy(false);
  };
  return (
    <>
      <Button variant="secondary" size="icon" className={cn('size-12 rounded-full shadow-md shadow-ink/10', inDialog && 'pointer-events-auto')} data-no-screenshot="" data-tour={inDialog ? undefined : 'problem-report'} aria-label={t('problemReport.button')} title={t('problemReport.button')} disabled={busy} onClick={() => void open()}>
        <Bug className="size-5" aria-hidden />
      </Button>
      {opened && <ProblemReportDialog screenshot={opened.screenshot} context={opened.context} imageToAi={availability.data.imageToAi} canAnalyze={availability.data.canAnalyze} onClose={() => setOpened(null)} />}
    </>
  );
}
