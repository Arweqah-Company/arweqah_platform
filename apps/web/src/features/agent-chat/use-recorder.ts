import { AGENT_AUDIO_MAX_SECONDS } from '@arweqah-platform/shared';
import { useEffect, useRef, useState } from 'react';

export type RecorderError = 'denied' | 'unsupported';

/** The microphone: `start` asks for it and records, `stop` (or the time limit) hands the recording to `onDone`. Nothing is kept once it is handed over. */
export function useRecorder(onDone: (recording: Blob) => void) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<RecorderError | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; });

  const release = () => {
    clearInterval(timer.current);
    recorder.current?.stream.getTracks().forEach((track) => track.stop());
    recorder.current = null;
    setRecording(false);
  };
  /** Leaving the screen gives the microphone back. */
  useEffect(() => () => {
    clearInterval(timer.current);
    recorder.current?.stream.getTracks().forEach((track) => track.stop());
  }, []);

  const stop = () => {
    if (recorder.current?.state === 'recording') recorder.current.stop();
  };

  const start = async (): Promise<void> => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return setError('unsupported');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const next = new MediaRecorder(stream);
      next.ondataavailable = (e) => chunks.push(e.data);
      next.onstop = () => {
        const sound = new Blob(chunks, { type: next.mimeType });
        release();
        done.current(sound);
      };
      recorder.current = next;
      next.start();
      setSeconds(0);
      setRecording(true);
      timer.current = setInterval(() => setSeconds((s) => { if (s + 1 >= AGENT_AUDIO_MAX_SECONDS) stop(); return s + 1; }), 1000);
    } catch {
      setError('denied');
    }
  };

  return { recording, seconds, error, start, stop };
}
