import { FileUp } from 'lucide-react';
import { useId, useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from './alert';

interface Props {
  /** Called with the files that passed the type and size checks. */
  onFiles: (files: File[]) => void;
  /** Same syntax as the `accept` attribute of an input: extensions (`.xlsx`) and MIME types (`image/*`). */
  accept?: string;
  multiple?: boolean;
  /** Per-file limit in bytes: shown under the prompt and checked here, for a drop as well as for a click. */
  maxBytes?: number;
  busy?: boolean;
  disabled?: boolean;
  /** A shorter box for composers (a reply, a comment); the look is the same. */
  compact?: boolean;
  /** Replaces «Drop the file here, or click to browse» (e.g. «Drop the picture here…»). */
  prompt?: string;
  /** An extra line under the limit (what kind of file, how many rows). */
  hint?: string;
  /** Accessible name of the picker. */
  label: string;
}

type Verdict = { ok: File[]; problem: 'badType' | 'tooBig' | null };

/** Dropping ignores the input's `accept`, so the type is checked here for both ways of choosing. */
export function acceptsFile(file: File, accept?: string): boolean {
  if (!accept) return true;
  const name = file.name.toLowerCase();
  return accept.split(',').map((rule) => rule.trim().toLowerCase()).filter(Boolean).some((rule) => {
    if (rule.startsWith('.')) return name.endsWith(rule);
    if (rule.endsWith('/*')) return file.type.startsWith(rule.slice(0, -1));
    return file.type === rule;
  });
}

function check(files: File[], accept?: string, maxBytes?: number): Verdict {
  const typed = files.filter((file) => acceptsFile(file, accept));
  const ok = typed.filter((file) => !maxBytes || file.size <= maxBytes);
  if (ok.length === files.length) return { ok, problem: null };
  return { ok, problem: typed.length < files.length ? 'badType' : 'tooBig' };
}

function useDropzone({ onFiles, accept, multiple, maxBytes, off }: Pick<Props, 'onFiles' | 'accept' | 'maxBytes'> & { multiple: boolean; off: boolean }) {
  const [dragging, setDragging] = useState(false);
  const [problem, setProblem] = useState<Verdict['problem']>(null);

  const take = (picked: File[]) => {
    const verdict = check(multiple ? picked : picked.slice(0, 1), accept, maxBytes);
    setProblem(verdict.problem);
    if (verdict.ok.length) onFiles(verdict.ok);
  };
  const box = {
    onDragOver: (event: DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      if (!off) setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: (event: DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      setDragging(false);
      if (!off) take(Array.from(event.dataTransfer.files));
    },
  };
  return { dragging, problem, box, take };
}

function boxClass(dragging: boolean, compact: boolean, off: boolean): string {
  const state = dragging ? 'border-link bg-petrol-50' : 'border-neutral-500 bg-petrol-50/40 hover:bg-petrol-50';
  const size = compact ? 'min-h-24 py-4' : 'min-h-40 py-8';
  const lock = off ? 'cursor-not-allowed opacity-60' : '';
  return `flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 text-center text-sm text-muted transition-colors focus-within:border-link focus-within:ring-4 focus-within:ring-link/15 ${size} ${state} ${lock}`;
}

function DropzoneText({ busy, multiple, compact, prompt, hint, maxBytes }: Pick<Props, 'busy' | 'multiple' | 'compact' | 'prompt' | 'hint' | 'maxBytes'>) {
  const { t } = useTranslation();
  const idle = prompt ?? t(multiple ? 'dropzone.promptMany' : 'dropzone.promptOne');
  return (
    <>
      <FileUp className={compact ? 'size-6 text-link' : 'size-8 text-link'} aria-hidden />
      <span>{busy ? t('dropzone.busy') : idle}</span>
      {maxBytes && <span className="text-xs">{t('dropzone.limit', { mb: maxBytes / 1024 / 1024 })}</span>}
      {hint && <span className="text-xs">{hint}</span>}
    </>
  );
}

/**
 * The one place a person picks or drops a file (employee photo, ticket and task attachments, list import):
 * a dashed soft box with the upload icon, «drop here or click to browse» and the size limit (standing rule 14).
 */
export function FileDropzone(props: Props) {
  const { t } = useTranslation();
  const id = useId();
  const { onFiles, accept, multiple, maxBytes, busy, disabled, compact, label } = props;
  const off = Boolean(busy || disabled);
  const { dragging, problem, box, take } = useDropzone({ onFiles, accept, multiple: Boolean(multiple), maxBytes, off });

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} {...box} className={boxClass(dragging, Boolean(compact), off)}>
        <DropzoneText {...props} />
        <input
          id={id}
          type="file"
          className="sr-only"
          aria-label={label}
          accept={accept}
          multiple={multiple}
          disabled={off}
          onChange={(event) => { take(Array.from(event.target.files ?? [])); event.target.value = ''; }}
        />
      </label>
      {problem && <Alert>{t(`dropzone.${problem}`, { mb: (maxBytes ?? 0) / 1024 / 1024 })}</Alert>}
    </div>
  );
}
