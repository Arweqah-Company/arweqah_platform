import type { RoleDto } from '@arweqah-platform/shared';
import { useEffect, useRef } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { useRoles } from '@/features/roles';
import { useLookups } from '../api';
import type { FormState } from './form-state';

const withRole = (ids: string[], id: string | undefined): string[] => (id ? [...new Set([...ids, id])] : ids);
const without = (ids: string[], id: string | undefined): string[] => ids.filter((x) => x !== id);

/**
 * The roles ticked from the start: for a new employee the base role (Employee, or the collaborator base for a relation with limited access) and the role of the chosen job title; for anyone, changing the job title swaps the role of the old title for the one of the new title, and changing the relation swaps the base role.
 * They are ordinary ticks on the roles step; whatever is unticked stays unticked.
 */
export function useDefaultRoles(form: UseFormReturn<FormState>, options: { editing: boolean; savedTitleId: string; enabled: boolean }): void {
  const roles = useRoles();
  const relations = useLookups().data?.relationTypes;
  const relationTypeId = useWatch({ control: form.control, name: 'relationTypeId' });
  const limited = relations?.find((r) => r.id === relationTypeId)?.limitedAccess === true;
  const previousLimited = useRef<boolean | null>(null);
  const jobTitleId = useWatch({ control: form.control, name: 'jobTitleId' });
  const previousTitleId = useRef(options.savedTitleId);
  const baseTicked = useRef(options.editing);
  const list = roles.data;

  useEffect(() => {
    if (!options.enabled || !list || !relations) return;
    const before = form.getValues('roleIds');
    const ids = nextRoleIds(before, list, { limited, previousLimited: previousLimited.current, baseTicked: baseTicked.current, jobTitleId, previousTitleId: previousTitleId.current });
    baseTicked.current ||= list.some((r) => r.autoRule === (limited ? 'limited_access' : 'everyone'));
    previousLimited.current = limited;
    previousTitleId.current = jobTitleId;
    if (ids.join() !== before.join()) form.setValue('roleIds', ids, { shouldDirty: true });
  }, [options.enabled, list, relations, limited, jobTitleId, form]);
}

interface Change {
  limited: boolean;
  previousLimited: boolean | null;
  baseTicked: boolean;
  jobTitleId: string;
  previousTitleId: string;
}

const baseRule = (limited: boolean) => (limited ? 'limited_access' : 'everyone');

/** The ticks after the relation or the job title changed: only the base role and the title role move, whatever was unticked stays unticked. */
function nextRoleIds(ids: string[], list: RoleDto[], c: Change): string[] {
  const base = list.find((r) => r.autoRule === baseRule(c.limited));
  let next = c.baseTicked ? ids : withRole(ids, base?.id);
  if (c.previousLimited !== null && c.previousLimited !== c.limited) next = withRole(without(next, list.find((r) => r.autoRule === baseRule(c.previousLimited as boolean))?.id), base?.id);
  if (c.jobTitleId !== c.previousTitleId) next = withRole(without(next, list.find((r) => r.jobTitleId === c.previousTitleId)?.id), list.find((r) => r.jobTitleId === c.jobTitleId)?.id);
  return next;
}
