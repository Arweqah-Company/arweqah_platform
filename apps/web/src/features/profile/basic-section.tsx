import type { EmployeeDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { SectionCard } from '@/shared/ui';

/** The basic personal data kept in the employee record (name, gender, nationality, birth date, marital status), shown read-only: HR changes it. */
export function BasicSection({ employee }: { employee: EmployeeDto }) {
  const { t, i18n } = useTranslation('profile');
  const ar = i18n.language === 'ar';
  const named = (v: { nameAr: string; nameEn: string } | null) => (v ? (ar ? v.nameAr : v.nameEn) : null);
  const facts: [string, string | null | undefined][] = [
    [t('basic.fullName'), employee.fullName],
    [t('basic.gender'), employee.gender === null ? null : t(employee.gender === 0 ? 'basic.male' : 'basic.female')],
    [t('basic.nationality'), named(employee.names.nationality)],
    [t('basic.birthDate'), employee.birthDate],
    [t('basic.maritalStatus'), named(employee.names.maritalStatus)],
  ];
  return (
    <SectionCard id="basic" title={t('basic.title')} description={t('basic.description')}>
      <dl className="grid gap-4 text-sm sm:col-span-2 sm:grid-cols-2">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-0.5">{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  );
}
