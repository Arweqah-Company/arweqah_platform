import type { FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';
import { SHELL_STEPS } from './tour-steps';

export { TourProvider } from './tour-provider';
export { useTourControls } from './tour-context';
export { RestartTourButton } from './restart-tour-button';
export { TourStepsTab } from './steps-tab';
export { TOUR_KEYS } from './keys';

/** The welcome tour. The shell's own steps are declared here; every feature declares the steps of its pages (`FeatureModule.tour`). */
export const tourFeature: FeatureModule = {
  id: 'tour',
  tour: SHELL_STEPS,
  i18n: { ar, en },
};
