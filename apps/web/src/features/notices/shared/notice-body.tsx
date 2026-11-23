import type { FileDto } from '@arweqah-platform/shared';
import { FileChip, RichText } from '@/shared/ui';

/** The text as it reaches the people (in a soft panel) and its attached files; `base` is the API path the files are read from. */
export function NoticeBody({ html, files, base }: { html: string; files: FileDto[]; base: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-neutral-50 p-4 text-sm leading-8">
        <RichText html={html} />
      </div>
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {files.map((f) => (
            <li key={f.id}>
              <FileChip file={{ name: f.originalName, contentType: f.contentType, previewPath: `${base}/attachments/${f.id}/preview`, downloadUrl: `/api${base}/attachments/${f.id}` }} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
