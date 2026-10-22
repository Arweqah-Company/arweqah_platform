import type { EmployeeDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { SectionCard } from '@/shared/ui';

/** The job details HR keeps, shown read-only. */
export function WorkSection({ employee }: { employee: EmployeeDto }) {
  const { t, i18n } = useTranslation('profile');
  const ar = i18n.language === 'ar';
  const facts: [string, string | null | undefined][] = [
    [t('work.number'), employee.employeeNumber],
    [t('work.company'), ar ? employee.company.nameAr : employee.company.nameEn],
    [t('work.unit'), employee.orgNode ? (ar ? employee.orgNode.pathAr : employee.orgNode.pathEn) : null],
    [t('work.title'), employee.jobTitle ? (ar ? employee.jobTitle.nameAr : employee.jobTitle.nameEn) : null],
    [t('work.manager'), employee.manager?.fullName],
    [t('work.workEmail'), employee.workEmail],
    [t('work.startDate'), employee.startDate],
  ];
  return (
    <SectionCard id="work" title={t('work.title_section')} description={t('work.description')}>
      <dl className="grid gap-4 text-sm sm:col-span-2 sm:grid-cols-2">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-0.5" dir={label === t('work.workEmail') || label === t('work.number') ? 'ltr' : undefined}>{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  );
}
