import { CorePermission, type EmployeeDto } from '@arweqah-platform/shared';
import { Camera, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Can } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Button, ConfirmDialog, SectionCard } from '@/shared/ui';
import { useRemovePhoto } from './api';
import { EmployeeAvatar } from './employee-avatar';
import { PhotoDialog } from './photo-dialog';

/** The employee's picture at the top of their page, with the buttons to change or remove it for who may (FR-91). */
export function PhotoSection({ employee }: { employee: EmployeeDto }) {
  const { t } = useTranslation('employees');
  const remove = useRemovePhoto(employee.id);
  const [dialog, setDialog] = useState<'change' | 'remove' | null>(null);
  return (
    <SectionCard id="photo" title={t('photo.section')}>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2" data-tour="employee-photo">
        <EmployeeAvatar employee={employee} size="lg" />
        <Can permission={CorePermission.EmployeesPhotoUpdate}>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setDialog('change')}><Camera className="size-4" aria-hidden />{t(employee.photoFileId ? 'photo.change' : 'photo.add')}</Button>
            {employee.photoFileId && <Button variant="ghost" onClick={() => setDialog('remove')}><Trash2 className="size-4" aria-hidden />{t('photo.remove')}</Button>}
          </div>
          {dialog === 'change' && <PhotoDialog employeeId={employee.id} open onOpenChange={(open) => !open && setDialog(null)} />}
          <ConfirmDialog
            open={dialog === 'remove'}
            onOpenChange={(open) => !open && setDialog(null)}
            tone="danger"
            title={t('photo.removeDialog.title')}
            description={t('photo.removeDialog.description')}
            confirmLabel={t('photo.remove')}
            busy={remove.isPending}
            onConfirm={async () => {
              try {
                await remove.mutateAsync();
                toast.success(t('photo.removed'));
              } catch (error) {
                toast.error(errorMessage(t, error));
              } finally {
                setDialog(null);
              }
            }}
          />
        </Can>
      </div>
    </SectionCard>
  );
}
