import type { IdTypeLookupDto } from '@arweqah-platform/shared';
import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ApiError } from '@/core/api/api-client';
import { errorMessage } from '@/shared/lib/error-message';
import { useCreateEmployee, useEmployee, useUpdateEmployee } from '../api';
import { EMPTY_FORM, employeeResolverWithIdRule, toFormState, toPayload, type FormState } from './form-state';

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

/** The form's data and behaviour: load, validate with the shared rules, save, and put API rule errors under their field. */
export function useEmployeeForm(id: string | undefined, idTypes: IdTypeLookupDto[]) {
  const { t, i18n } = useTranslation('employees');
  const { t: tc } = useTranslation();
  const navigate = useNavigate();
  const employee = useEmployee(id);
  const create = useCreateEmployee();
  const update = useUpdateEmployee(id ?? '');
  const resolver = useMemo(() => employeeResolverWithIdRule(idTypes, i18n.language), [idTypes, i18n.language]);
  const form = useForm<FormState>({ resolver, defaultValues: EMPTY_FORM, mode: 'all' });
  const editing = !!id;
  const [idTypeId, nationalityId] = useWatch({ control: form.control, name: ['idTypeId', 'nationalityId'] });

  // The ID-number rule depends on the type and the nationality: re-check the number when either changes.
  useEffect(() => {
    if (form.formState.isSubmitted) void form.trigger('idNumber');
  }, [idTypeId, nationalityId, form]);

  useEffect(() => {
    if (employee.data) form.reset(toFormState(employee.data));
  }, [employee.data, form]);

  /** The API's own validation (a list of issues): each one goes under its field; what has no field is said in the toast. */
  const failValidation = (issues: Issue[]): boolean => {
    const placed = issues.filter((issue) => isFormField(issue.path?.[0]));
    for (const issue of placed) form.setError(issue.path?.[0] as keyof FormState, { type: 'server', message: issue.message });
    return placed.length > 0;
  };

  const fail = (error: unknown) => {
    const details = error instanceof ApiError ? error.details : undefined;
    if (Array.isArray(details) && failValidation(details as Issue[])) return;
    const rule = details as RuleDetails | undefined;
    const text = i18n.language === 'ar' ? rule?.messageAr : rule?.messageEn;
    if (rule?.path && rule.path in EMPTY_FORM) form.setError(rule.path as keyof FormState, { type: 'server', message: text ?? errorMessage(tc, error) });
    else toast.error(errorMessage(tc, error));
  };

  const submit = form.handleSubmit(async (values) => {
    try {
      const payload = toPayload(values, editing) as never;
      if (editing) {
        await update.mutateAsync(payload);
        toast.success(t('saved'));
        navigate(`/employees/${id}`);
      } else {
        const result = await create.mutateAsync(payload);
        navigate(`/employees/${result.employee.id}`, { state: { invitation: result.invitation } });
      }
    } catch (error) {
      fail(error);
    }
  });

  return { form, employee, editing, submit };
}
