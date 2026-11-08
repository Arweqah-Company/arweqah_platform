import type { MyCareerProfileDto } from '@arweqah-platform/shared';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui';
import { canAcknowledge, canGoNext, nextOf, previousOf, READ_STEPS, stepIndex, type ReadStep } from './read-steps';

interface Props {
  me: MyCareerProfileDto;
  step: ReadStep;
  reached: number;
  atEnd: boolean;
  checked: boolean;
  busy: boolean;
  onChecked: (value: boolean) => void;
  onMove: (step: ReadStep) => void;
  onNext: () => void;
  onAcknowledge: () => void;
}

/** Where the reader is, and «Previous» / «Next» (Next waits for the end of the section). */
function Navigation({ step, reached, atEnd, onMove, onNext }: Pick<Props, 'step' | 'reached' | 'atEnd' | 'onMove' | 'onNext'>) {
  const { t } = useTranslation('career-profile');
  const previous = previousOf(step);
  const next = nextOf(step);
  const nextOk = canGoNext(step, reached, atEnd);
  const label = step === 'ack' ? t('gate.lastStep') : t('gate.step', { n: stepIndex(step) + 1, total: READ_STEPS.length - 1, name: t(`sections.${step}`) });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-medium text-fg max-sm:basis-full">{label}</span>
      <span className="flex-1 max-sm:hidden" />
      {!nextOk && step !== 'ack' && <span role="status" className="text-sm text-muted max-sm:order-last max-sm:basis-full">{t('gate.scrollHint')}</span>}
      <div className="flex gap-2 max-sm:w-full [&>*]:max-sm:flex-1">
        <Button variant="secondary" disabled={!previous} onClick={() => previous && onMove(previous)}><ArrowRight className="size-4 rtl:-scale-x-100 ltr:rotate-180" aria-hidden />{t('gate.previous')}</Button>
        {next && <Button disabled={!nextOk} onClick={onNext}>{t(next === 'ack' ? 'gate.nextAck' : 'gate.next', { section: next === 'ack' ? '' : t(`sections.${next}`) })}<ArrowLeft className="size-4 rtl:-scale-x-100 ltr:rotate-180" aria-hidden /></Button>}
      </div>
    </div>
  );
}

/** The acknowledgement box: a slim line while locked (with its reason), the sentence and what is recorded once the last step is reached. */
function AckBox({ me, ready, checked, onChecked }: Pick<Props, 'me' | 'checked' | 'onChecked'> & { ready: boolean }) {
  const { t } = useTranslation('career-profile');
  const style = ready ? 'cursor-pointer border-link bg-petrol-50' : 'cursor-not-allowed border-neutral-200 opacity-60';
  return (
    <label className={`flex min-w-0 flex-1 items-start gap-3 rounded-2xl border px-3 py-2 ${style}`}>
      <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-petrol-800" disabled={!ready} checked={ready && checked} onChange={(e) => onChecked(e.target.checked)} />
      {ready ? (
        <span>
          <b className="block text-fg">{me.content?.ackText || t('gate.ackDefault')}</b>
          <span className="text-sm text-muted">{t('gate.ackRecorded', { version: me.contentVersion })}</span>
        </span>
      ) : (
        <span className="text-sm text-muted">{t('gate.ackLocked')}</span>
      )}
    </label>
  );
}

/** The bar kept at the bottom while reading: where the reader is, «Previous» / «Next», and the acknowledgement box, which stays off until the last step. */
export function ReadingBar({ me, step, reached, atEnd, checked, busy, onChecked, onMove, onNext, onAcknowledge }: Props) {
  const { t } = useTranslation('career-profile');
  const ready = canAcknowledge(step, reached);
  return (
    <div className="sticky bottom-2 z-10 flex flex-col gap-2 rounded-3xl border border-neutral-200 bg-white p-3 shadow-md" data-tour="career-reading-bar">
      <Navigation step={step} reached={reached} atEnd={atEnd} onMove={onMove} onNext={onNext} />
      <div className="flex flex-wrap items-center gap-3">
        <AckBox me={me} ready={ready} checked={checked} onChecked={onChecked} />
        <Button disabled={!ready || !checked || busy} onClick={onAcknowledge}>{t('gate.ackButton')}</Button>
      </div>
    </div>
  );
}
