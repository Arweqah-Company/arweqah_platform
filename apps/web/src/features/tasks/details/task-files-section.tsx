import { CorePermission, MAX_TASK_FILES, type FileDto, type TaskDto, type TaskFileDto, type TaskFileKind } from '@arweqah-platform/shared';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { usePermissions } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { formatDateTime } from '@/shared/lib/format-date';
import { Button, ConfirmDialog, FileAttachments, FileChip } from '@/shared/ui';
import { useAddTaskFiles, useRemoveTaskFile } from '../api';

/** One file: its chip (name downloads, «View» opens it inside the system), who handed it in and when, and its remove button for who may. */
function FileRow({ taskId, file, onRemove }: { taskId: string; file: TaskFileDto; onRemove: (file: TaskFileDto) => void }) {
  const { t } = useTranslation('tasks');
  return (
    <li className="flex flex-wrap items-center gap-2">
      <FileChip file={{ name: file.name, contentType: file.contentType, previewPath: `/tasks/${taskId}/files/${file.id}/preview`, downloadUrl: `/api/tasks/${taskId}/files/${file.id}` }} />
      <span className="text-xs text-muted">{t('files.addedBy', { name: file.addedBy.name, date: formatDateTime(file.addedAt) })}</span>
      {file.canRemove && (
        <button type="button" aria-label={t('files.remove', { name: file.name })} title={t('files.removeShort')} className="grid size-7 place-items-center rounded-full text-danger-text hover:bg-danger-50" onClick={() => onRemove(file)}>
          <Trash2 className="size-4" aria-hidden />
        </button>
      )}
    </li>
  );
}

/** Uploads files first (a thumbnail to check each one) and attaches them to the task with one button. */
function AddFiles({ task, kind }: { task: TaskDto; kind: TaskFileKind }) {
  const { t } = useTranslation('tasks');
  const { t: tc } = useTranslation();
  const [files, setFiles] = useState<FileDto[]>([]);
  const [uploading, setUploading] = useState(false);
  const add = useAddTaskFiles(task.id, kind);
  const attach = async () => {
    const sent = new Set(files.map((f) => f.id));
    try {
      await add.mutateAsync({ fileIds: [...sent] });
      setFiles((now) => now.filter((f) => !sent.has(f.id))); // a file chosen while the request was on its way was not in it: it stays
      toast.success(t(`files.${kind}Added`));
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <FileAttachments files={files} onChange={setFiles} max={MAX_TASK_FILES} label={t(`files.${kind}Add`)} compact onBusyChange={setUploading} />
      <div><Button disabled={files.length === 0 || add.isPending || uploading} onClick={() => void attach()}>{t(`files.${kind}Add`)}</Button></div>
    </div>
  );
}

function Group({ task, kind, files, canAdd, onRemove }: { task: TaskDto; kind: TaskFileKind; files: TaskFileDto[]; canAdd: boolean; onRemove: (file: TaskFileDto) => void }) {
  const { t } = useTranslation('tasks');
  if (files.length === 0 && !canAdd) return null;
  return (
    <div className="flex flex-col gap-2" data-testid={`task-files-${kind}`}>
      <h3 className="text-sm font-bold">{t(`files.${kind}Title`)}</h3>
      {files.length === 0 ? <p className="text-sm text-muted">{t(`files.${kind}Empty`)}</p> : <ul className="flex flex-col gap-2">{files.map((f) => <FileRow key={f.id} taskId={task.id} file={f} onRemove={onRemove} />)}</ul>}
      {canAdd && <AddFiles task={task} kind={kind} />}
    </div>
  );
}

/** The files of the task: the work files the giver attached and the delivery files the doer handed in. Hidden when there is nothing to show and nothing to add. */
export function TaskFilesSection({ task }: { task: TaskDto }) {
  const { t } = useTranslation('tasks');
  const { t: tc } = useTranslation();
  const { can } = usePermissions();
  const remove = useRemoveTaskFile(task.id);
  const [removing, setRemoving] = useState<TaskFileDto | null>(null);
  const reference = task.files.filter((f) => f.kind === 'reference');
  const delivery = task.files.filter((f) => f.kind === 'delivery');
  const canAdd = task.abilities.addFiles && can(CorePermission.TasksFileAdd);
  const canDeliver = task.abilities.deliverFiles && can(CorePermission.TasksFileDeliver);
  if (task.files.length === 0 && !canAdd && !canDeliver) return null;
  const confirm = async () => {
    try {
      if (removing) await remove.mutateAsync(removing.id);
      toast.success(t('files.removed'));
      setRemoving(null);
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
  };
  return (
    <section aria-labelledby="task-files" className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 id="task-files" className="text-lg font-bold">{t('files.title')}</h2>
      <Group task={task} kind="reference" files={reference} canAdd={canAdd} onRemove={setRemoving} />
      <Group task={task} kind="delivery" files={delivery} canAdd={canDeliver} onRemove={setRemoving} />
      <ConfirmDialog open={!!removing} onOpenChange={(open) => !open && setRemoving(null)} title={t('files.removeTitle')} description={removing ? t('files.removeDescription', { name: removing.name }) : undefined} confirmLabel={t('files.removeShort')} tone="danger" busy={remove.isPending} onConfirm={confirm} />
    </section>
  );
}
