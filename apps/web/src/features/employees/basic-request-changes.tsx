import { BASIC_REQUEST_FIELDS, type BasicRequestDto, type BasicRequestField, type EmployeeDto } from '@arweqah-platform/shared';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** What the request would change, field by field: today's value, an arrow, the value asked for. Used by HR's card and the employee's own page. */
export function BasicRequestChanges({ employee, request }: { employee: EmployeeDto; request: BasicRequestDto }) {
  const { t, i18n } = useTranslation('employees');
  const ar = i18n.language === 'ar';
  const named = (v: { nameAr: string; nameEn: string } | null) => (v ? (ar ? v.nameAr : v.nameEn) : '—');
  const gender = (v: number | null | undefined) => (v === 0 ? t('gender.male') : v === 1 ? t('gender.female') : '—');
  const now: Record<BasicRequestField, string> = { fullName: employee.fullName, gender: gender(employee.gender), nationalityId: named(employee.names.nationality), birthDate: employee.birthDate ?? '—', maritalStatusId: named(employee.names.maritalStatus) };
  const asked: Record<BasicRequestField, string> = { fullName: request.values.fullName ?? '', gender: gender(request.values.gender), nationalityId: named(request.names.nationality), birthDate: request.values.birthDate ?? '', maritalStatusId: named(request.names.maritalStatus) };
  return (
    <dl className="grid gap-3 text-sm sm:col-span-2">
      {BASIC_REQUEST_FIELDS.filter((f) => request.values[f] !== undefined).map((field) => (
        <div key={field} className="flex flex-wrap items-center gap-2">
          <dt className="w-40 text-xs text-muted">{t(`fields.${field}`)}</dt>
          <dd className="flex flex-wrap items-center gap-2"><span className="text-muted">{now[field]}</span><ArrowLeft className="size-4 text-muted ltr:rotate-180" aria-hidden /><span className="font-medium">{asked[field]}</span></dd>
        </div>
      ))}
    </dl>
  );
}
