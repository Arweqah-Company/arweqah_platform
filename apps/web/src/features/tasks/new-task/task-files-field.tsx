import { CorePermission, MAX_TASK_FILES, type FileDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/core/permissions/can';
import { FileAttachments } from '@/shared/ui';

/** The reference files of a new task: the same box as a ticket's (a thumbnail to look at each file before sending). Only for who holds `tasks.file_add`. */
export function TaskFilesField({ files, onChange, onBusyChange, locked }: { files: FileDto[]; onChange: (files: FileDto[]) => void; onBusyChange: (busy: boolean) => void; locked: boolean }) {
  const { t } = useTranslation('tasks');
  const { can } = usePermissions();
  if (!can(CorePermission.TasksFileAdd)) return null;
  return (
    <div className="flex flex-col gap-1.5" data-testid="task-files-field">
      <span className="text-sm font-medium">{t('files.referenceTitle')}</span>
      <p className="text-xs text-muted">{t('files.referenceHint')}</p>
      <FileAttachments files={files} onChange={onChange} max={MAX_TASK_FILES} label={t('files.referenceTitle')} onBusyChange={onBusyChange} locked={locked} />
    </div>
  );
}
