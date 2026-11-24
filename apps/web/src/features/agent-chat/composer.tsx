import { AGENT_IMAGE_MAX_BYTES, AGENT_IMAGE_TYPES, AGENT_MAX_IMAGES, AGENT_MESSAGE_MAX_CHARS, type FileDto } from '@arweqah-platform/shared';
import { Mic, Paperclip, SendHorizontal, Square, X } from 'lucide-react';
import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useUploader } from '@/shared/lib/use-uploader';
import { Alert, Button, FileDropzone, Textarea, checkFiles } from '@/shared/ui';
import type { ChatFile } from './chat-file';
import { useSpeech } from './use-speech';

const ACCEPT = AGENT_IMAGE_TYPES.join(',');
const SOUND_ACCEPT = 'audio/*,.mp3,.m4a,.wav,.ogg,.opus,.webm,.aac';
/** A sound file as it arrives from the phone or the recorder: the biggest one taken before it is made a WAV (a long mp3 or an uncompressed recording). */
const SOUND_MAX_BYTES = 30 * 1024 * 1024;
const isSound = (file: File): boolean => file.type.startsWith('audio/') || /\.(mp3|m4a|wav|ogg|opus|webm|aac)$/i.test(file.name);

interface Props {
  busy: boolean;
  /** The person holds `agent.attach_image`: the paperclip, the paste and the drop of a picture work only then. */
  canAttach: boolean;
  /** The person holds `agent.use_voice`: the microphone and a sound file work only then. */
  canSpeak: boolean;
  onSend: (text: string, files: ChatFile[]) => void;
}

/** The pictures waiting to be sent: uploaded as soon as they are chosen, each with a local preview that is released when it is taken out or the box goes. */
function usePictures() {
  const [files, setFiles] = useState<FileDto[]>([]);
  const urls = useRef(new Map<string, string>());
  const release = (id: string) => {
    const url = urls.current.get(id);
    if (url) URL.revokeObjectURL(url);
    urls.current.delete(id);
  };
  useEffect(() => () => { urls.current.forEach((url) => URL.revokeObjectURL(url)); }, []);
  const uploader = useUploader({
    files,
    onChange: setFiles,
    max: AGENT_MAX_IMAGES,
    path: '/agent/files',
    onUploaded: (chosen, stored) => urls.current.set(stored.id, URL.createObjectURL(chosen)),
    onRemoved: (file) => release(file.id),
  });
  /** Hands the pictures over to the message that is sent: their previews now belong to it. */
  const take = (): ChatFile[] => {
    const taken = files.map((f): ChatFile => ({ id: f.id, name: f.originalName, contentType: f.contentType, size: f.size, localUrl: urls.current.get(f.id) }));
    urls.current.clear();
    setFiles([]);
    return taken;
  };
  return { files, urlOf: (id: string) => urls.current.get(id), take, ...uploader };
}

/** The chosen pictures, each small with a button to take it out. */
function Thumbnails({ files, urlOf, onRemove }: { files: FileDto[]; urlOf: (id: string) => string | undefined; onRemove: (file: FileDto) => void }) {
  const { t } = useTranslation('agentChat');
  return (
    <ul className="flex flex-wrap gap-2">
      {files.map((file) => (
        <li key={file.id} className="relative size-16 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
          <img src={urlOf(file.id)} alt={file.originalName} className="size-full object-cover" />
          <button type="button" aria-label={t('images.remove', { name: file.originalName })} onClick={() => onRemove(file)} className="absolute end-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-white/90 text-fg shadow hover:bg-white">
            <X className="size-3" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

type Pictures = ReturnType<typeof usePictures>;
type Speech = ReturnType<typeof useSpeech>;

/** What is chosen, pasted or dropped on the box: a sound goes to be written down, pictures through the same check as one chosen in the file box. */
function useChosenFiles(can: { attach: boolean; speak: boolean }, pictures: Pictures, speech: Speech) {
  const [problem, setProblem] = useState<'badType' | 'tooBig' | null>(null);
  const accept = (picked: File[]) => {
    const sounds = can.speak ? picked.filter(isSound) : [];
    const rest = picked.filter((file) => !sounds.includes(file));
    if (sounds[0]) speech.fromFile(sounds[0]);
    if (rest.length === 0) return setProblem(null);
    const verdict = checkFiles(rest, ACCEPT, AGENT_IMAGE_MAX_BYTES);
    setProblem(verdict.problem);
    if (verdict.ok.length) void pictures.pick(verdict.ok);
  };
  /** Takes what the event carries when it carries files; anything else (text pasted, a link dragged) is left to the browser. */
  const takeFrom = (files: File[], event: { preventDefault: () => void }) => {
    if ((!can.attach && !can.speak) || files.length === 0) return;
    event.preventDefault();
    accept(files);
  };
  return {
    problem,
    accept,
    clearProblem: () => setProblem(null),
    onPaste: (e: ClipboardEvent) => takeFrom(Array.from(e.clipboardData.files), e),
    onDrop: (e: DragEvent) => takeFrom(Array.from(e.dataTransfer.files), e),
  };
}

const clock = (seconds: number): string => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** What the microphone and the writing-down are doing, and what went wrong. */
function SpeechStatus({ speech, cut }: { speech: Speech; cut: boolean }) {
  const { t } = useTranslation('agentChat');
  return (
    <>
      {speech.problem && <Alert>{speech.problem}</Alert>}
      {speech.recording && <p role="status" className="text-sm font-medium text-fg"><span aria-hidden className="me-1 text-danger">●</span>{t('voice.recording', { time: clock(speech.seconds) })}</p>}
      {speech.working && <p role="status" className="text-sm text-muted">{t('voice.working')}</p>}
      {cut && <p className="text-xs text-muted">{t('voice.cut')}</p>}
    </>
  );
}

type Can = { attach: boolean; speak: boolean };

/** Which kind of file box the person has: pictures, sound, or both (the words and the limits of the box follow it). */
const kindOf = (can: Can): 'both' | 'voice' | 'images' => (can.attach && can.speak ? 'both' : can.speak ? 'voice' : 'images');

/** The kinds the file box takes: the pictures of the person's key and the sound files of theirs. */
const acceptOf = (can: Can): string => [can.attach && ACCEPT, can.speak && SOUND_ACCEPT].filter(Boolean).join(',');

interface TrayProps {
  pictures: Pictures;
  speech: Speech;
  chosen: ReturnType<typeof useChosenFiles>;
  can: Can;
  /** The file box is open (the paperclip was pressed). */
  open: boolean;
  cut: boolean;
}

/** The dashed box that takes pictures, sound files or both, by what the person may do. */
function ChooseBox({ pictures, speech, chosen, can }: Omit<TrayProps, 'open' | 'cut'>) {
  const { t } = useTranslation('agentChat');
  const kind = kindOf(can);
  const full = !can.speak && pictures.files.length >= AGENT_MAX_IMAGES;
  return <FileDropzone multiple compact label={t(`pick.${kind}.label`)} accept={acceptOf(can)} maxBytes={can.speak ? SOUND_MAX_BYTES : AGENT_IMAGE_MAX_BYTES} busy={pictures.busy || speech.working} disabled={full} prompt={t(`pick.${kind}.prompt`)} hint={t(`pick.${kind}.hint`, { max: AGENT_MAX_IMAGES })} onFiles={(picked) => { chosen.clearProblem(); chosen.accept(picked); }} />;
}

/** What shows above the writing box while files are being chosen or waiting: the problems, the file box, the small pictures, the recording and the warning. */
function Tray({ open, cut, ...rest }: TrayProps) {
  const { t } = useTranslation('agentChat');
  const { t: tc } = useTranslation();
  const { pictures, speech, chosen, can } = rest;
  const message = pictures.error ?? (chosen.problem && tc(`dropzone.${chosen.problem}`, { mb: AGENT_IMAGE_MAX_BYTES / 1024 / 1024 }));
  return (
    <div className="flex flex-col gap-2">
      {message && <Alert>{message}</Alert>}
      <SpeechStatus speech={speech} cut={cut} />
      {open && <ChooseBox {...rest} />}
      {pictures.files.length > 0 && <Thumbnails files={pictures.files} urlOf={pictures.urlOf} onRemove={pictures.remove} />}
      <p className="text-xs text-muted">{t(`pick.${kindOf(can)}.notice`)}</p>
    </div>
  );
}

/** The paperclip (pictures and sound files) and the microphone beside the writing box. */
function FileButtons({ can, open, onToggle, speech, disabled }: { can: Can; open: boolean; onToggle: () => void; speech: Speech; disabled: boolean }) {
  const { t } = useTranslation('agentChat');
  return (
    <>
      {(can.attach || can.speak) && <Button type="button" variant="ghost" size="icon" aria-label={t('images.attach')} aria-pressed={open} disabled={disabled} onClick={onToggle}><Paperclip className="size-4" aria-hidden /></Button>}
      {can.speak && (
        <Button type="button" variant="ghost" size="icon" aria-label={speech.recording ? t('voice.stop') : t('voice.record')} aria-pressed={speech.recording} disabled={disabled && !speech.recording} onClick={speech.toggle}>
          {speech.recording ? <Square className="size-4 text-danger" aria-hidden /> : <Mic className="size-4" aria-hidden />}
        </Button>
      )}
    </>
  );
}

/** What is typed, and the words the speech adds after it (a long speech is cut at the size of a message and says so). */
function useDraftText() {
  const [text, setText] = useState('');
  const [cut, setCut] = useState(false);
  return {
    text,
    cut,
    setText,
    addHeard: (heard: string, truncated: boolean) => {
      setText((now) => [now.trim(), heard].filter(Boolean).join(' '));
      setCut(truncated);
    },
    clear: () => { setText(''); setCut(false); },
  };
}

type Draft = ReturnType<typeof useDraftText>;

/** What sending does: it waits while a recording or a transcription goes on, and takes the pictures with the text. */
function useSending({ busy, onSend, pictures, speech, draft }: Pick<Props, 'busy' | 'onSend'> & { pictures: Pictures; speech: Pick<Speech, 'working' | 'recording'>; draft: Draft }) {
  const [open, setOpen] = useState(false);
  const empty = !draft.text.trim() && pictures.files.length === 0;
  const waiting = busy || pictures.busy || speech.working || speech.recording;
  const submit = () => {
    if (empty || waiting) return;
    onSend(draft.text.trim(), pictures.take());
    draft.clear();
    setOpen(false);
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };
  return { open, setOpen, submit, onKey, disabledSend: waiting || empty };
}

/** The box the employee writes in: Enter sends, Shift+Enter adds a line; a picture is attached with the paperclip, pasted (Ctrl/Cmd+V) or dropped on the box; speech is recorded or chosen as a file and written down into the box to be read before sending. */
export function Composer({ busy, canAttach, canSpeak, onSend }: Props) {
  const { t } = useTranslation('agentChat');
  const box = useRef<HTMLTextAreaElement>(null);
  const can = { attach: canAttach, speak: canSpeak };
  const pictures = usePictures();
  const draft = useDraftText();
  const speech = useSpeech((heard, truncated) => { draft.addHeard(heard, truncated); box.current?.focus(); });
  const sending = useSending({ busy, onSend, pictures, speech, draft });
  const chosen = useChosenFiles(can, pictures, speech);
  const files = canAttach || canSpeak;
  const showTray = files && (sending.open || pictures.files.length > 0 || speech.recording || speech.working || Boolean(speech.problem) || draft.cut);
  return (
    <form className="flex flex-col gap-2 border-t border-neutral-200 p-3" onSubmit={(e) => { e.preventDefault(); sending.submit(); }} onDragOver={(e) => files && e.preventDefault()} onDrop={chosen.onDrop}>
      {showTray && <Tray pictures={pictures} speech={speech} chosen={chosen} can={can} open={sending.open} cut={draft.cut} />}
      <div className="flex items-end gap-2">
        <FileButtons can={can} open={sending.open} onToggle={() => sending.setOpen(!sending.open)} speech={speech} disabled={busy} />
        <Textarea ref={box} aria-label={t('write')} placeholder={t('placeholder')} rows={2} maxLength={AGENT_MESSAGE_MAX_CHARS} value={draft.text} onChange={(e) => draft.setText(e.target.value)} onKeyDown={sending.onKey} onPaste={chosen.onPaste} className="min-h-12 flex-1 resize-none" />
        <Button type="submit" size="icon" aria-label={t('send')} disabled={sending.disabledSend}>
          <SendHorizontal className="size-4 rtl:-scale-x-100" aria-hidden />
        </Button>
      </div>
    </form>
  );
}
