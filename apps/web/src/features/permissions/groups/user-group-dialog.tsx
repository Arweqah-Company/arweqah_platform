import type { UserGroupDto } from '@arweqah-platform/shared';
import { X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GroupDialogShell } from '@/shared/groups/group-dialog-shell';
import type { GroupNames } from '@/shared/groups/group-names-fields';
import { useDebounced } from '@/shared/lib/use-debounced';
import { Button, FormField, Input } from '@/shared/ui';
import { usePeople, useSaveUserGroup } from './user-groups.api';

type Member = { id: string; name: string };

/** Search by name or e-mail and add people one by one; each member can be taken out again. */
function MemberPicker({ members, onChange }: { members: Member[]; onChange: (members: Member[]) => void }) {
  const { t } = useTranslation('permissions', { keyPrefix: 'userGroups' });
  const [search, setSearch] = useState('');
  const found = usePeople(useDebounced(search, 250)).data ?? [];
  const add = (person: { id: string; nameAr: string }) => { if (!members.some((m) => m.id === person.id)) onChange([...members, { id: person.id, name: person.nameAr }]); };
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-medium">{t('members')} ({members.length})</legend>
      <FormField label={t('searchPerson')} hint={t('searchHint')}>{(p) => <Input {...p} value={search} onChange={(e) => setSearch(e.target.value)} />}</FormField>
      {found.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={t('results')}>
          {found.map((p) => <li key={p.id}><Button size="sm" variant="secondary" disabled={members.some((m) => m.id === p.id)} onClick={() => add(p)}>{p.nameAr}</Button></li>)}
        </ul>
      )}
      <ul className="flex flex-wrap gap-2" aria-label={t('members')}>
        {members.map((m) => (
          <li key={m.id} className="inline-flex items-center gap-1 rounded-full bg-petrol-50 py-1 ps-3 pe-1 text-sm">
            {m.name}
            <button type="button" aria-label={t('removeMember', { name: m.name })} className="grid size-6 place-items-center rounded-full hover:bg-petrol-800/10" onClick={() => onChange(members.filter((x) => x.id !== m.id))}><X className="size-3" aria-hidden /></button>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

/** A group of people: its names and who is in it. The permissions of the group are set on the permissions page. */
export function UserGroupDialog({ group, onClose }: { group: UserGroupDto | null; onClose: (savedId?: string) => void }) {
  const { t } = useTranslation('permissions', { keyPrefix: 'userGroups' });
  const save = useSaveUserGroup();
  const [names, setNames] = useState<GroupNames>({ nameAr: group?.nameAr ?? '', nameEn: group?.nameEn ?? '', description: group?.description ?? '' });
  const [members, setMembers] = useState<Member[]>(() => group?.members ?? []);
  const submit = () => save.mutateAsync({ id: group?.id, input: { nameAr: names.nameAr.trim(), nameEn: names.nameEn.trim(), description: names.description.trim() || undefined, userIds: members.map((m) => m.id) } });
  return (
    <GroupDialogShell title={group ? t('edit') : t('new')} names={names} onNames={setNames} save={submit} savedText={t('saved')} error={save.error} busy={save.isPending} onClose={onClose}>
      <MemberPicker members={members} onChange={setMembers} />
    </GroupDialogShell>
  );
}
