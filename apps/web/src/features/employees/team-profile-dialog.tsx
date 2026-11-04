import type { DirectoryLevel, DirectoryProfileDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Badge, Button, Dialog } from '@/shared/ui';
import { useTeamProfile } from './api';
import { EmployeeAvatar } from './employee-avatar';

const LEVEL_TONE: Record<DirectoryLevel, 'neutral' | 'info' | 'success'> = { basic: 'neutral', extended: 'info', full: 'success' };
const MODES = ['onsite', 'hybrid', 'remote'] as const;

function Facts({ rows }: { rows: [string, string | null, boolean?][] }) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      {rows.map(([label, value, ltr]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs text-muted">{label}</dt>
          <dd className="break-words font-medium">{value ? <span dir={ltr ? 'ltr' : undefined}>{value}</span> : <span className="text-muted">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

const useNames = () => {
  const { i18n } = useTranslation('employees', { keyPrefix: 'team' });
  return (name: { nameAr: string; nameEn: string } | null | undefined): string | null => (name ? (i18n.language === 'ar' ? name.nameAr : name.nameEn) : null);
};

function ProfileBody({ p, onClose }: { p: DirectoryProfileDto; onClose: () => void }) {
  const { t, i18n } = useTranslation('employees', { keyPrefix: 'team' });
  const { t: tc } = useTranslation();
  const name = useNames();
  const ar = i18n.language === 'ar';
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-4">
        <EmployeeAvatar employee={p} size="lg" />
        <Badge tone={LEVEL_TONE[p.level]}>{t(`level.${p.level}`)}</Badge>
      </div>
      <Facts rows={[
        [t('unit'), p.orgNode ? (ar ? p.orgNode.pathAr : p.orgNode.pathEn) : null],
        [t('company'), name(p.company)],
        [t('manager'), p.manager?.fullName ?? null],
        [t('workEmail'), p.workEmail, true],
        [t('workPhone'), p.workPhone, true],
      ]} />
      {p.details && <Details details={p.details} />}
      <div className="flex justify-end gap-2">
        {p.level === 'full' && <Button asChild variant="secondary"><Link to={`/employees/${p.id}`}>{t('openRecord')}</Link></Button>}
        <Button variant="secondary" onClick={onClose}>{tc('actions.close')}</Button>
      </div>
    </div>
  );
}

function Details({ details }: { details: NonNullable<DirectoryProfileDto['details']> }) {
  const { t } = useTranslation('employees', { keyPrefix: 'team' });
  return (
    <Facts rows={[
      [t('workLocation'), details.workLocation],
      [t('workMode'), details.workMode === null ? null : t(`mode.${MODES[details.workMode] ?? 'onsite'}`)],
      [t('startDate'), details.startDate, true],
      [t('personalPhone'), details.personalPhone, true],
      [t('personalEmail'), details.personalEmail, true],
    ]} />
  );
}

/** A colleague's profile at the depth the viewer's relation allows: the basics, the work and contact details for a manager, a link to the whole record for who may open it (FR-92). */
export function TeamProfileDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useTranslation('employees', { keyPrefix: 'team' });
  const { t: tc } = useTranslation();
  const profile = useTeamProfile(id);
  const name = useNames();
  const p = profile.data;
  return (
    <Dialog open wide onOpenChange={(open) => !open && onClose()} title={p?.fullName ?? t('profile')} description={name(p?.jobTitle) ?? undefined}>
      {profile.isError && <Alert>{errorMessage(tc, profile.error)}</Alert>}
      {!p && !profile.isError && <p role="status" className="text-sm text-muted">{t('loading')}</p>}
      {p && <ProfileBody p={p} onClose={onClose} />}
    </Dialog>
  );
}
