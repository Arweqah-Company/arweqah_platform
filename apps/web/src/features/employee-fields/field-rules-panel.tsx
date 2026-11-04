import { CorePermission, EMPLOYEE_FIELD_GROUPS, type EmployeeFieldRuleDto } from '@arweqah-platform/shared';
import { ListChecks } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAdminMode } from '@/core/admin-mode/use-admin-mode';
import { usePermissions } from '@/core/permissions/can';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import { errorMessage } from '@/shared/lib/error-message';
import { matchesText } from '@/shared/lib/text-match';
import { useListPage } from '@/shared/lib/use-list-page';
import { Alert, Button, DataTable, EmptyState, ListToolbar, PageHeader, type FilterField } from '@/shared/ui';
import { useFieldRules, useSaveFieldRules } from './api';
import { ruleColumns, ruleExportColumns, type Draft } from './rules-columns';

const YES_NO = (t: (key: string) => string) => [{ value: 'yes', label: t('yes') }, { value: 'no', label: t('no') }];

/** Who may change each detail of an employee: the person, HR, or only the platform administrator (FR-94). Changes are held until «Save». */
export function EmployeeFieldsPage() {
  const { t } = useTranslation('employeeFields');
  const { t: te } = useTranslation('employees');
  const { t: tc } = useTranslation();
  const { active } = useAdminMode();
  const canEdit = usePermissions().can(CorePermission.EmployeeFieldsEdit);
  const rules = useFieldRules();
  const save = useSaveFieldRules();
  const list = useListPage('employee-fields');
  const [edits, setEdits] = useState<Record<string, Partial<Draft>>>({});
  const label = (field: string) => te(`fields.${field}`, { defaultValue: field });
  const draft = (rule: EmployeeFieldRuleDto): Draft => ({ editableBySelf: rule.editableBySelf, editableByHr: rule.editableByHr, ...edits[rule.field] });

  const rows = useMemo(() => (rules.data ?? []).filter((r) => {
    const d = { editableBySelf: r.editableBySelf, editableByHr: r.editableByHr, ...edits[r.field] };
    const f = list.filters.values;
    return matchesText([label(r.field), r.field, t(`groups.${r.group}`)], list.term) && (!f.group || r.group === f.group) && (!f.self || d.editableBySelf === (f.self === 'yes')) && (!f.hr || d.editableByHr === (f.hr === 'yes'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [rules.data, edits, list.term, list.filters.values]);

  const fields: FilterField[] = [
    { id: 'group', label: t('columns.group'), type: 'select', options: EMPLOYEE_FIELD_GROUPS.map((g) => ({ value: g, label: t(`groups.${g}`) })) },
    { id: 'self', label: t('columns.self'), type: 'select', options: YES_NO(t) },
    { id: 'hr', label: t('columns.hr'), type: 'select', options: YES_NO(t) },
  ];
  const onChange = (rule: EmployeeFieldRuleDto, patch: Partial<Draft>) => setEdits((e) => ({ ...e, [rule.field]: { ...e[rule.field], ...patch } }));
  const changed = Object.keys(edits).length;
  const saveAll = async () => {
    try {
      await save.mutateAsync({ rules: Object.entries(edits).map(([field, patch]) => ({ field, ...draft(rules.data?.find((r) => r.field === field) as EmployeeFieldRuleDto), ...patch })) as never });
      setEdits({});
      toast.success(t('saved'));
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
  };

  if (!active) return <Alert tone="info">{tc('adminMode.needed')}</Alert>;
  const exchange = <ExchangeButtons permissions={{ export: CorePermission.EmployeeFieldsExport }} exporting={{ columns: ruleExportColumns(t, label, draft), filename: 'employee-fields', pageRows: rows, total: rows.length, loadAll: async () => rows }} />;
  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <DataTable<EmployeeFieldRuleDto>
        listKey="employee-fields"
        caption={t('title')}
        rows={rules.data ? rows : undefined}
        isLoading={rules.isPending}
        error={rules.error}
        view={list.view}
        toolbar={<ListToolbar listKey="employee-fields" {...list.toolbar({ label: t('searchLabel'), placeholder: t('searchPlaceholder') }, fields)} actions={exchange} />}
        rowKey={(r) => r.field}
        empty={<EmptyState icon={ListChecks} title={t('noMatches')} />}
        columns={ruleColumns({ t, label, draft, canEdit, onChange })}
      />
      {canEdit && changed > 0 && (
        <div role="region" aria-label={t('saveBar')} className="sticky bottom-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-5 py-3 shadow-md shadow-ink/10">
          <span className="text-sm font-medium">{t('changed', { count: changed })}</span>
          <span className="flex gap-2">
            <Button variant="secondary" onClick={() => setEdits({})}>{t('discard')}</Button>
            <Button disabled={save.isPending} onClick={() => void saveAll()}>{t('save')}</Button>
          </span>
        </div>
      )}
    </>
  );
}
