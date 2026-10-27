import type { TranslationDto } from '@arweqah-platform/shared';
import { TRANSLATE_MAX_CHARS } from '@arweqah-platform/shared';
import { useEffect, useRef } from 'react';
import { ApiError, apiClient } from '@/core/api/api-client';
import { useDebounced } from './use-debounced';

const ARABIC_LETTER = /\p{Script=Arabic}/u;

/**
 * Fills an English field from its Arabic twin while the person types (Amazon Translate through the API).
 * It only writes while the English field is empty or still holds what it wrote itself: once the person edits the English text,
 * their words stay. When translation is not available (no keys on the server) it quietly stops.
 */
export function useAutoEnglish(arabic: string, english: string, setEnglish: (value: string) => void): void {
  const mine = useRef('');
  const stopped = useRef(false);
  const latest = useRef({ english, setEnglish });
  const source = useDebounced(arabic.trim().slice(0, TRANSLATE_MAX_CHARS), 700);

  useEffect(() => {
    latest.current = { english, setEnglish };
  });

  useEffect(() => {
    const free = () => latest.current.english.trim() === '' || latest.current.english === mine.current;
    if (stopped.current || !ARABIC_LETTER.test(source) || !free()) return;
    let current = true;
    apiClient
      .post<TranslationDto>('/translate', { text: source })
      .then((out) => {
        if (!current || !free()) return;
        mine.current = out.text;
        latest.current.setEnglish(out.text);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.code === 'TRANSLATION_UNAVAILABLE') stopped.current = true;
      });
    return () => {
      current = false;
    };
  }, [source]);
}
