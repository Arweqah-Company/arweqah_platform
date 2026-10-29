import { Compass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';
import { useTourControls } from './tour-context';

/** «Restart the tour» for the profile page: it plays the general tour again from its first step. */
export function RestartTourButton() {
  const { t } = useTranslation('tour');
  const { restart } = useTourControls();
  return (
    <Button variant="secondary" onClick={() => void restart('general')}>
      <Compass className="size-4" aria-hidden />
      {t('restart')}
    </Button>
  );
}
