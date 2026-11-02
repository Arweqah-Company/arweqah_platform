import type { RoleDto } from '@arweqah-platform/shared';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { http, HttpResponse } from 'msw';
import { FormProvider, useForm, useWatch, type UseFormReturn } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { roles as baseRoles, server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { EMPTY_FORM, type FormState } from './form-state';
import { RolesStep, roleGroups } from './roles-step';
import { useDefaultRoles } from './use-default-roles';

const role = (over: Partial<RoleDto>): RoleDto => ({ ...(baseRoles[0] as RoleDto), isSystem: false, ...over });
const origin = (companyId: string) => ({ companyId, companyNameAr: 'ش', companyNameEn: 'Co', unitNameAr: '', unitNameEn: '' });
const everyone = role({ id: 'r-all', nameAr: 'موظف', nameEn: 'Employee', assignment: 'auto', autoRule: 'everyone' });
const titleA = role({ id: 'r-ta', nameAr: 'مطور', nameEn: 'Developer', assignment: 'auto', autoRule: 'job_title', jobTitleId: 't-a' });
const titleB = role({ id: 'r-tb', nameAr: 'محاسب', nameEn: 'Accountant', assignment: 'auto', autoRule: 'job_title', jobTitleId: 't-b' });
const head = role({ id: 'r-head', nameAr: 'قائد القسم', nameEn: 'Head of Section', assignment: 'auto', autoRule: 'node_head', origin: origin('c1') });
const otherHead = role({ id: 'r-head2', nameAr: 'قائد قسم آخر', nameEn: 'Other head', assignment: 'auto', autoRule: 'node_head', origin: origin('c2') });
const reports = role({ id: 'r-rep', nameAr: 'مدير مباشر', nameEn: 'Direct manager', assignment: 'auto', autoRule: 'has_reports' });
const supervisor = role({ id: 'r-sup', nameAr: 'مشرف', nameEn: 'Supervisor' });
const ROLES = [everyone, titleA, titleB, head, otherHead, reports, supervisor];

let formRef: UseFormReturn<FormState> | undefined;
function Harness({ values, editing = false, savedTitleId = '' }: { values: Partial<FormState>; editing?: boolean; savedTitleId?: string }) {
  const form = useForm<FormState>({ defaultValues: { ...EMPTY_FORM, ...values } });
  useEffect(() => {
    formRef = form;
  }, [form]);
  useDefaultRoles(form, { editing, savedTitleId, enabled: true });
  const ids = useWatch({ control: form.control, name: 'roleIds' });
  return <FormProvider {...form}><output data-testid="ids">{ids.join(',')}</output><RolesStep /></FormProvider>;
}
const ids = () => (screen.getByTestId('ids').textContent ?? '').split(',').filter(Boolean).sort();
const serve = () => server.use(http.get('*/api/roles', () => HttpResponse.json(ROLES)));

describe('RolesStep and the roles ticked from the start (second step of the employee form)', () => {
  it('ticks the Employee role for a new employee and the role of the job title chosen, and swaps it when the title changes', async () => {
    serve();
    renderPage(<Harness values={{ companyId: 'c1' }} />);
    await waitFor(() => expect(ids()).toEqual(['r-all']));
    await act(async () => formRef?.setValue('jobTitleId', 't-a'));
    await waitFor(() => expect(ids()).toEqual(['r-all', 'r-ta']));
    await act(async () => formRef?.setValue('jobTitleId', 't-b'));
    await waitFor(() => expect(ids()).toEqual(['r-all', 'r-tb']));
  });

  it('lets the Employee role and the title role be unticked, warns about the Employee role, and keeps them off', async () => {
    serve();
    renderPage(<Harness values={{ companyId: 'c1', jobTitleId: 't-a', roleIds: [] }} />);
    const titleBox = await screen.findByLabelText(/^مطور/);
    await waitFor(() => expect(ids()).toEqual(['r-all', 'r-ta']));
    expect(titleBox).toBeEnabled();
    fireEvent.click(screen.getByLabelText(/^موظف/));
    fireEvent.click(titleBox);
    await waitFor(() => expect(ids()).toEqual([]));
    expect(await screen.findByText(/دون دور «موظف»/)).toBeInTheDocument();
    fireEvent.click(titleBox);
    await waitFor(() => expect(ids()).toEqual(['r-ta']));
  });

  it('offers the head roles of the employee\'s company and the manual roles, and shows what is held but not offered', async () => {
    serve();
    renderPage(<Harness values={{ companyId: 'c1', jobTitleId: 't-a', roleIds: ['r-tb', 'r-rep'] }} editing savedTitleId="t-a" />);
    expect(await screen.findByLabelText(/^قائد القسم/)).toBeEnabled();
    expect(screen.queryByLabelText(/^قائد قسم آخر/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/^مشرف/));
    await waitFor(() => expect(ids()).toEqual(['r-rep', 'r-sup', 'r-tb']));
    const old = screen.getByLabelText(/^محاسب/);
    expect(old).toBeChecked();
    fireEvent.click(old);
    await waitFor(() => expect(ids()).toEqual(['r-rep', 'r-sup']));
    expect(screen.getByLabelText(/^مدير مباشر/)).toBeDisabled();
  });

  it('does not add the Employee role by itself when an employee is edited', async () => {
    serve();
    renderPage(<Harness values={{ companyId: 'c1', jobTitleId: 't-a', roleIds: ['r-ta'] }} editing savedTitleId="t-a" />);
    await screen.findByLabelText(/^مطور/);
    expect(ids()).toEqual(['r-ta']);
  });

  it('works out the groups of roles', () => {
    const g = roleGroups(ROLES, { jobTitleId: 't-b', companyId: 'c1', heldIds: ['r-ta', 'r-rep'] });
    expect(g).toMatchObject({ everyone, title: titleB, heads: [head], manual: [supervisor], held: [titleA], computed: [reports] });
  });
});
