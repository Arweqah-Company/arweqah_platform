import type { PlacementInput, UserDto } from '@arweqah-platform/shared';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Dialog, FormField, Input } from '@/shared/ui';
import { useAssignRoles, useCreateUser, useSetPlacement } from './api';
import { PlacementFields } from './placement-fields';
import { RoleChecklist } from './role-checklist';

const EMPTY: PlacementInput = { branchId: null, departmentId: null, teamId: null, managerId: null };

export function CreateUserDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('users');
  const { t: tc } = useTranslation();
  const create = useCreateUser();
  const [v, setV] = useState({ name: '', email: '', password: '' });
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [placement, setPlacement] = useState<PlacementInput>(EMPTY);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await create.mutateAsync({ ...v, password: v.password || undefined, locale: 'ar', roleIds, placement });
    toast.success(t('created'));
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('new')}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        {create.isError && <Alert>{errorMessage(tc, create.error)}</Alert>}
        <FormField label={t('name')}>{(p) => <Input {...p} required minLength={2} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />}</FormField>
        <FormField label={t('email')}>{(p) => <Input {...p} required type="email" dir="ltr" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />}</FormField>
        <FormField label={t('password')} hint={t('passwordHint')}>
          {(p) => <Input {...p} type="password" minLength={10} autoComplete="new-password" dir="ltr" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} />}
        </FormField>
        <PlacementFields value={placement} onChange={setPlacement} />
        <RoleChecklist value={roleIds} onChange={setRoleIds} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button type="submit" disabled={create.isPending}>{tc('actions.create')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function EditAccessDialog({ user, onClose }: { user: UserDto; onClose: () => void }) {
  const { t } = useTranslation('users');
  const { t: tc } = useTranslation();
  const assign = useAssignRoles();
  const place = useSetPlacement();
  const [roleIds, setRoleIds] = useState(user.roles.map((r) => r.id));
  const [placement, setPlacement] = useState<PlacementInput>(user.placement);
  const error = assign.error ?? place.error;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await place.mutateAsync({ id: user.id, placement });
    await assign.mutateAsync({ id: user.id, roleIds });
    toast.success(t('updated'));
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('editAccess')} description={user.name}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        {error && <Alert>{errorMessage(tc, error)}</Alert>}
        <PlacementFields value={placement} onChange={setPlacement} />
        <RoleChecklist value={roleIds} onChange={setRoleIds} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button type="submit" disabled={assign.isPending || place.isPending}>{tc('actions.save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
