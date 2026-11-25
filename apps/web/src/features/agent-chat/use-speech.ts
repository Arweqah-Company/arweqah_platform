import type { AgentTranscriptDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '@/shared/lib/error-message';
import { transcribe } from './api';
import { AudioProblem, toWav } from './audio-wav';
import { useRecorder } from './use-recorder';

/**
 * Speaking to the assistant (FR-181): a recording or a sound file becomes a WAV here, the server turns it into text and the text goes to `onText`, to be read and edited
 * before it is sent. The sound is held for the one request and never kept.
 */
export function useSpeech(onText: (text: string, truncated: boolean) => void) {
  const { t } = useTranslation('agentChat');
  const { t: tc } = useTranslation();
  const [working, setWorking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const understand = async (sound: Blob): Promise<void> => {
    setProblem(null);
    setWorking(true);
    try {
      const result: AgentTranscriptDto = await transcribe(await toWav(sound));
      if (result.text) onText(result.text, result.truncated);
      else setProblem(t('voice.nothing'));
    } catch (error) {
      setProblem(error instanceof AudioProblem ? t(`voice.${error.code}`) : errorMessage(tc, error));
    } finally {
      setWorking(false);
    }
  };

  const recorder = useRecorder((sound) => void understand(sound));
  const microphone = recorder.error ? t(`voice.${recorder.error}`) : null;
  return {
    working,
    recording: recorder.recording,
    seconds: recorder.seconds,
    problem: problem ?? microphone,
    /** The microphone button: starts a recording, or stops it (which sends it to be written down). */
    toggle: () => void (recorder.recording ? recorder.stop() : recorder.start()),
    fromFile: (file: File) => void understand(file),
    clear: () => setProblem(null),
  };
}

