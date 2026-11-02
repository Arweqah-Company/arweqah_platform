import { useEffect, useRef } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { useRoles } from '@/features/roles';
import type { FormState } from './form-state';

/**
 * The roles ticked from the start: for a new employee the Employee role and the role of the chosen job title, and for anyone, changing the job title swaps the role of the old title for the one of the new title.
 * They are ordinary ticks on the roles step; whatever is unticked stays unticked.
 */
export function useDefaultRoles(form: UseFormReturn<FormState>, options: { editing: boolean; savedTitleId: string; enabled: boolean }): void {
  const roles = useRoles();
  const jobTitleId = useWatch({ control: form.control, name: 'jobTitleId' });
  const previousTitleId = useRef(options.savedTitleId);
  const everyoneTicked = useRef(options.editing);
  const list = roles.data;

  useEffect(() => {
    if (!options.enabled || !list) return;
    let ids = form.getValues('roleIds');
    const everyone = list.find((r) => r.autoRule === 'everyone');
    if (!everyoneTicked.current && everyone) {
      everyoneTicked.current = true;
      ids = [...new Set([...ids, everyone.id])];
    }
    if (jobTitleId !== previousTitleId.current) {
      const oldRole = list.find((r) => r.jobTitleId === previousTitleId.current);
      const newRole = list.find((r) => r.jobTitleId === jobTitleId);
      ids = ids.filter((id) => id !== oldRole?.id);
      if (newRole) ids = [...new Set([...ids, newRole.id])];
      previousTitleId.current = jobTitleId;
    }
    if (ids.join() !== form.getValues('roleIds').join()) form.setValue('roleIds', ids, { shouldDirty: true });
  }, [options.enabled, list, jobTitleId, form]);
}
