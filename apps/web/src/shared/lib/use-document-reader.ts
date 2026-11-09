import { useState } from 'react';
import { DocumentReadError, readDocumentText } from './read-document';

export type ReadFailure = 'unsupported' | 'unreadable' | 'empty';

/** Reads the first file dropped into a `FileDropzone` as text (txt, Word, PDF) and hands it over; a failure is kept as its reason for the dialog to word. */
export function useDocumentReader(onText: (text: string) => void): { failure: ReadFailure | null; read: (files: File[]) => Promise<void> } {
  const [failure, setFailure] = useState<ReadFailure | null>(null);
  const read = async (files: File[]) => {
    setFailure(null);
    try {
      onText(await readDocumentText(files[0] as File));
    } catch (e) {
      setFailure(e instanceof DocumentReadError ? e.reason : 'unreadable');
    }
  };
  return { failure, read };
}
