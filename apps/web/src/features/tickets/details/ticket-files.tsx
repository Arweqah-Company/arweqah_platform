import type { TicketEventDto } from '@arweqah-platform/shared';
import { FileChip } from '@/shared/ui';

/** The files of one entry, each with its «View» button. */
export function TicketFiles({ ticketId, event }: { ticketId: string; event: TicketEventDto }) {
  if (event.attachments.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {event.attachments.map((a) => (
        <li key={a.fileId}><FileChip file={{ name: a.originalName, contentType: a.contentType, previewPath: `/tickets/${ticketId}/attachments/${a.fileId}/preview`, downloadUrl: `/api/tickets/${ticketId}/attachments/${a.fileId}` }} /></li>
      ))}
    </ul>
  );
}
