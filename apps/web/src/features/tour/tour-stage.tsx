import { Joyride, type Placement, type Step } from 'react-joyride';
import { useTranslation } from 'react-i18next';
import type { TourStepUi } from '@/core/feature';
import type { PlayStep } from './play-steps';
import { isPhoneLayout } from './tour-wait';
import { TourTooltip } from './tour-tooltip';

/** The reading direction decides which side «start» is. */
function placementOf(placement: TourStepUi['placement'], rtl: boolean): Placement | 'center' {
  if (placement === 'start') return rtl ? 'right' : 'left';
  if (placement === 'end') return rtl ? 'left' : 'right';
  return placement ?? 'bottom';
}

/** The ring, the dimming and the arrow take the theme's colors through CSS variables, so a theme switch repaints them at once. */
const LOOK = {
  options: { overlayColor: 'var(--tour-overlay)', arrowColor: 'var(--color-white)', zIndex: 60, spotlightRadius: 16, spotlightPadding: 6, skipBeacon: true, overlayClickAction: false as const, dismissKeyAction: false as const, blockTargetInteraction: true },
  styles: { spotlight: { stroke: 'var(--color-link)', strokeWidth: 2 } },
};

/** One step on screen. Joyride only draws the dimming, the ring and the bubble's place; the buttons and the keys are the tour's own (see `TourTooltip`). */
export function TourStage({ step }: { step: PlayStep }) {
  const { t, i18n } = useTranslation('tour');
  // The phone's drawer fills the screen: the bubble sits in the middle of it instead of beside it.
  const placement = step.ui.menu === 'drawer' && isPhoneLayout() ? 'center' : placementOf(step.ui.placement, i18n.dir() === 'rtl');
  const content = (
    <>
      <p>{step.body}</p>
      {step.can.length > 0 && (
        <div className="mt-3">
          <p className="font-medium text-fg">{t('canTitle')}</p>
          <ul className="mt-1 list-disc space-y-1 ps-5">{step.can.map((line) => <li key={line}>{line}</li>)}</ul>
        </div>
      )}
    </>
  );
  const joyStep: Step = { target: step.ui.target, placement, title: step.title, content };
  return (
    <Joyride
      run
      steps={[joyStep]}
      tooltipComponent={TourTooltip}
      locale={{ next: t('next'), back: t('back'), skip: t('skip'), close: t('close'), last: t('done') }}
      options={LOOK.options}
      styles={LOOK.styles}
    />
  );
}
