import { EMPLOYEE_PHOTO_TYPES } from '@arweqah-platform/shared';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Dialog, FileDropzone } from '@/shared/ui';
import { useSetPhoto } from './api';
import { cropToFile, drawCrop, type CropView } from './crop-image';

/** What the browser reads before cropping; the file sent is the cropped square, far below the 2 MB limit. */
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const PREVIEW = 256;

interface Loaded {
  image: HTMLImageElement;
  name: string;
}

function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <input type="range" className="accent-petrol-800" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function PhotoForm({ employeeId, close }: { employeeId: string; close: () => void }) {
  const { t } = useTranslation('employees');
  const { t: tc } = useTranslation();
  const setPhoto = useSetPhoto(employeeId);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [view, setView] = useState<CropView>({ zoom: 1, x: 0, y: 0 });

  useEffect(() => {
    if (loaded && canvas.current) drawCrop(canvas.current, loaded.image, view, PREVIEW);
  }, [loaded, view]);

  const choose = (file: File | undefined) => {
    setProblem(null);
    if (!file) return;
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      setView({ zoom: 1, x: 0, y: 0 });
      setLoaded({ image, name: file.name });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setProblem(t('photo.unreadable'));
    };
    image.src = url;
  };

  const save = async () => {
    if (!loaded) return;
    try {
      await setPhoto.mutateAsync(await cropToFile(loaded.image, view, loaded.name));
      toast.success(t('photo.saved'));
      close();
    } catch (error) {
      setProblem(errorMessage(tc, error));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {problem && <Alert>{problem}</Alert>}
      <FileDropzone label={t('photo.choose')} accept={EMPLOYEE_PHOTO_TYPES.join(',')} maxBytes={MAX_SOURCE_BYTES} prompt={t('photo.drop')} hint={t('photo.hint')} onFiles={([file]) => choose(file)} />
      {loaded && (
        <div className="flex flex-col items-center gap-3">
          <canvas ref={canvas} width={PREVIEW} height={PREVIEW} aria-label={t('photo.preview')} role="img" className="size-48 rounded-full border border-neutral-200" />
          <div className="grid w-full gap-3 sm:grid-cols-3">
            <Slider label={t('photo.zoom')} value={view.zoom} min={1} max={4} step={0.05} onChange={(zoom) => setView((v) => ({ ...v, zoom }))} />
            <Slider label={t('photo.horizontal')} value={view.x} min={-1} max={1} step={0.05} onChange={(x) => setView((v) => ({ ...v, x }))} />
            <Slider label={t('photo.vertical')} value={view.y} min={-1} max={1} step={0.05} onChange={(y) => setView((v) => ({ ...v, y }))} />
          </div>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={close}>{tc('actions.cancel')}</Button>
        <Button disabled={!loaded || setPhoto.isPending} onClick={() => void save()}>{t('photo.save')}</Button>
      </div>
    </div>
  );
}

/** Choose a picture, put the square where it should be, and upload it (FR-91). */
export function PhotoDialog({ employeeId, open, onOpenChange }: { employeeId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation('employees');
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('photo.title')} description={t('photo.description')}>
      <PhotoForm employeeId={employeeId} close={() => onOpenChange(false)} />
    </Dialog>
  );
}
