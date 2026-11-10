import { CorePermission, type IdTypeLookupDto } from '@arweqah-platform/shared';
import { useEffect, useMemo } from 'react';
import { useForm, useWatch, type UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ApiError } from '@/core/api/api-client';
import { errorMessage } from '@/shared/lib/error-message';
import { useAssignRoles, useCreateEmployee, useEmployee, useUpdateEmployee } from '../api';
import { usePermissions } from '@/core/permissions/can';
import { EMPTY_FORM, employeeResolverWithIdRule, roleExpiriesToSend, toFormState, toPayload, type FormState } from './form-state';

interface RuleDetails {
  path?: string;
  messageAr?: string;
  messageEn?: string;
}

interface Issue {
  path?: (string | number)[];
  message?: string;
}

const isFormField = (key: unknown): key is keyof FormState => typeof key === 'string' && key in EMPTY_FORM;

/** The fields of the roles step: an error on them is not a problem of the first step, so the person stays where they are and is told in words. */
const ROLES_FIELDS: readonly string[] = ['roleIds', 'roleExpiries'];

/** Puts what the API rejected under its field: its validation issues, or a business rule that names a field; the rest is a toast. */
function useServerErrors(form: UseFormReturn<FormState>) {
  const { i18n } = useTranslation('employees');
  const { t: tc } = useTranslation();
  /** Puts the issues under their fields; `onDetails` is true when one of them belongs to the first step (the roles step has no field to show it under, so it is said in a toast). */
  const place = (issues: Issue[]): { placed: boolean; onDetails: boolean } => {
    const placed = issues.filter((issue) => isFormField(issue.path?.[0]));
    for (const issue of placed) form.setError(issue.path?.[0] as keyof FormState, { type: 'server', message: issue.message });
    for (const issue of placed.filter((i) => ROLES_FIELDS.includes(String(i.path?.[0])))) toast.error(issue.message ?? '');
    return { placed: placed.length > 0, onDetails: placed.some((i) => !ROLES_FIELDS.includes(String(i.path?.[0]))) };
  };
  /** A business rule of the API that names the field it is about. */
  const placeRule = (rule: RuleDetails | undefined, fallback: string): boolean => {
    if (!rule?.path || !(rule.path in EMPTY_FORM)) return false;
    form.setError(rule.path as keyof FormState, { type: 'server', message: (i18n.language === 'ar' ? rule.messageAr : rule.messageEn) ?? fallback });
    return true;
  };
  /** True when the error was put under a field of the form (the person may be on another step and must be taken to it). */
  return (error: unknown): boolean => {
    const details = error instanceof ApiError ? error.details : undefined;
    const issues = Array.isArray(details) ? place(details as Issue[]) : { placed: false, onDetails: false };
    if (issues.placed) return issues.onDetails;
    if (placeRule(details as RuleDetails | undefined, errorMessage(tc, error))) return true;
    toast.error(errorMessage(tc, error));
    return false;
  };
}

/** The end dates the employee's roles had when the form was opened. */
const savedExpiries = (employee: { roles: { id: string; expiresAt: string | null }[] } | undefined): Record<string, string> =>
  Object.fromEntries((employee?.roles ?? []).filter((r) => r.expiresAt).map((r) => [r.id, r.expiresAt as string]));

/** Did the person change the unit, the job title or the manager (the change then needs a reason)? */
const placementChanged = (form: UseFormReturn<FormState>): boolean => {
  const { dirtyFields } = form.formState;
  return !!(dirtyFields.orgNodeId || dirtyFields.jobTitleId || dirtyFields.managerId);
};

/** Saving: a new employee is created with the roles of the form; an edited one is updated, and its roles saved when they or their end dates changed. */
function useSaveEmployee(form: UseFormReturn<FormState>, id: string | undefined, fail: (error: unknown) => boolean) {
  const { t } = useTranslation('employees');
  const navigate = useNavigate();
  const employee = useEmployee(id);
  const create = useCreateEmployee();
  const update = useUpdateEmployee(id ?? '');
  const assignRoles = useAssignRoles(id ?? '');
  const { can } = usePermissions();
  const editing = !!id;
  const saveEdit = async (values: FormState, payload: never) => {
    if (placementChanged(form) && !values.changeReason.trim()) return form.setError('changeReason', { type: 'rule', message: t('placementChange.reasonRequired') });
    await update.mutateAsync(payload);
    const { dirtyFields } = form.formState;
    if (can(CorePermission.EmployeesAssignRoles) && (dirtyFields.roleIds || dirtyFields.roleExpiries)) {
      await assignRoles.mutateAsync({ roleIds: values.roleIds, roleExpiries: roleExpiriesToSend(values, savedExpiries(employee.data)) });
    }
    toast.success(t('saved'));
    navigate(`/employees/${id}`);
  };
  const save = async (values: FormState, onInvalid?: () => void) => {
    try {
      const withRoles = can(CorePermission.EmployeesAssignRoles) && can(CorePermission.RolesView);
      // Without the roles step the server gives the default roles (Employee and the role of the job title).
      const payload = (editing || withRoles ? toPayload(values, editing) : { ...toPayload(values, false), roleIds: undefined, roleExpiries: undefined }) as never;
      if (editing) return await saveEdit(values, payload);
      const result = await create.mutateAsync(payload);
      navigate(`/employees/${result.employee.id}`, { state: { invitation: result.invitation } });
    } catch (error) {
      if (fail(error)) onInvalid?.(); // a field of the first step was refused: go back to it
    }
  };
  /** Saves the form; `onInvalid` runs when a field of the first step is wrong, here or on the server (the form goes back to it and says so). */
  return (event: React.BaseSyntheticEvent, onInvalid?: () => void) => form.handleSubmit((values) => save(values, onInvalid), onInvalid)(event);
}

/** The form's data and behaviour: load, validate with the shared rules, save, and put API rule errors under their field. */
export function useEmployeeForm(id: string | undefined, idTypes: IdTypeLookupDto[]) {
  const { i18n } = useTranslation('employees');
  const employee = useEmployee(id);
  const resolver = useMemo(() => employeeResolverWithIdRule(idTypes, i18n.language), [idTypes, i18n.language]);
  const form = useForm<FormState>({ resolver, defaultValues: EMPTY_FORM, mode: 'all' });
  const fail = useServerErrors(form);
  const [idTypeId, nationalityId] = useWatch({ control: form.control, name: ['idTypeId', 'nationalityId'] });

  // The ID-number rule depends on the type and the nationality: re-check the number when either changes.
  useEffect(() => {
    if (form.formState.isSubmitted) void form.trigger('idNumber');
  }, [idTypeId, nationalityId, form]);

  useEffect(() => {
    if (employee.data) form.reset(toFormState(employee.data));
  }, [employee.data, form]);

  const submit = useSaveEmployee(form, id, fail);
  return { form, employee, editing: !!id, submit };
}
