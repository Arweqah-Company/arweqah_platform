import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { errorMessage } from '@/shared/lib/error-message';
import { RestartTourButton } from '@/features/tour';
import { Alert, Button, PageHeader, SectionCard } from '@/shared/ui';
import { useOwnProfile } from './api';
import { AppearanceSection } from './appearance-section';
import { ContactSection } from './contact-section';
import { WorkSection } from './work-section';

/** A person's own page: appearance, the contact details they may change, and the job details HR keeps. */
export function ProfilePage() {
  const { t } = useTranslation('profile');
  const { t: tc } = useTranslation();
  const profile = useOwnProfile();
  const employee = profile.data?.employee;
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader title={t('title')} description={employee ? employee.fullName : t('description')} actions={<Button asChild variant="secondary"><Link to="/security"><ShieldCheck className="size-4" aria-hidden />{t('security')}</Link></Button>} />
      {profile.isError && <Alert>{errorMessage(tc, profile.error)}</Alert>}
      <AppearanceSection />
      <SectionCard id="tour" title={t('tour.title')} description={t('tour.description')}>
        <div className="sm:col-span-2"><RestartTourButton /></div>
      </SectionCard>
      {profile.data && !employee && <Alert tone="info">{t('noEmployee')}</Alert>}
      {employee && <ContactSection key={employee.updatedAt} employee={employee} />}
      {employee && <WorkSection employee={employee} />}
    </div>
  );
}
