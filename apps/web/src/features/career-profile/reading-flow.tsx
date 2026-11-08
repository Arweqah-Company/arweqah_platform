import type { CareerContent, MyCareerProfileDto } from '@arweqah-platform/shared';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ApiError } from '@/core/api/api-client';
import { Alert } from '@/shared/ui';
import { useAcknowledge } from './api';
import { ReadingBar } from './reading-bar';
import { ReadingTabs } from './reading-tabs';
import { isOpen, nextOf, reachedAfter, stepIndex, type ReadStep } from './read-steps';
import { SectionBody } from './section-body';
import type { CareerSectionKey } from './sections';
import { useReachedEnd } from './use-reached-end';

/** The step 6: the acknowledgement sentence and what was read. */
function AckStep({ content }: { content: CareerContent }) {
  const { t } = useTranslation('career-profile');
  return (
    <div className="flex flex-col gap-3">
      <Alert tone="success">{t('gate.ackStepDone')}</Alert>
      <p className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-fg">{content.ackText || t('gate.ackDefault')}</p>
      <p className="text-sm text-muted">{t('gate.ackStepHint')}</p>
    </div>
  );
}

/**
 * While the acknowledgement is required (first sign-in, a new title, or reopened by HR): the five sections open one after the other, «Next» works only
 * after the reader reached the end of the section, and the acknowledgement is the sixth and last step (decision 245).
 */
export function ReadingFlow({ me }: { me: MyCareerProfileDto }) {
  const { t } = useTranslation('career-profile');
  const content = me.content as CareerContent;
  const [step, setStep] = useState<ReadStep>('description');
  const [reached, setReached] = useState(0);
  const [checked, setChecked] = useState(false);
  const marker = useRef<HTMLDivElement>(null);
  const atEnd = useReachedEnd(marker, step);
  const acknowledge = useAcknowledge();
  useEffect(() => window.scrollTo({ top: 0 }), [step]);
  const go = (to: ReadStep) => (isOpen(to, reached) ? setStep(to) : toast.info(t('gate.lockedToast')));
  const next = () => {
    const to = nextOf(step);
    if (!to) return;
    setReached(reachedAfter(step, reached));
    setStep(to);
  };
  const send = () => acknowledge.mutate(me.contentVersion as number, { onSuccess: () => toast.success(t('gate.done')) });
  const stale = acknowledge.error instanceof ApiError && acknowledge.error.status === 409;
  return (
    <div className="flex flex-col gap-4">
      <Alert tone="warning"><b>{t(`gate.why.${me.ackReason ?? 'first'}`)}.</b> {t('gate.intro')}</Alert>
      {acknowledge.isError && <Alert tone="danger">{stale ? t('gate.stale') : t('gate.failed')}</Alert>}
      <div className="rounded-3xl border border-neutral-200 bg-white p-4">
        <ReadingTabs step={step} reached={reached} onChoose={go} />
        <div role="tabpanel" aria-labelledby={`read-tab-${step}`} tabIndex={-1}>
          {step === 'ack' ? <AckStep content={content} /> : <SectionBody section={step as CareerSectionKey} content={content} stage={me.stage} />}
          <div ref={marker} className="h-px" aria-hidden data-step={stepIndex(step)} />
        </div>
      </div>
      <ReadingBar me={me} step={step} reached={reached} atEnd={atEnd} checked={checked} busy={acknowledge.isPending} onChecked={setChecked} onMove={go} onNext={next} onAcknowledge={send} />
    </div>
  );
}
