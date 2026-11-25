import type { AgentFileDto } from '@arweqah-platform/shared';
import { AGENT_MAX_IMAGES } from '@arweqah-platform/shared';

/** The field of an action that holds the ids of the files that go with it (a ticket, a reply). The platform fills it from the conversation's pictures; the model never does. */
export const FILE_IDS_FIELD = 'fileIds';

/** The line the model reads in place of the pictures themselves: how many came with the message. */
export const imageLine = (count: number): string => (count > 0 ? `[${count} picture${count === 1 ? '' : 's'} attached]` : '');

/** The text of an employee's message as the model reads it: what they wrote and, when pictures came with it, how many. */
export function messageText(text: string, count: number): string {
  const line = imageLine(count);
  return [text, line].filter(Boolean).join('\n') || '(no text)';
}

/** The pictures the model is shown: those of the newest message that has pictures (it may be asked about them again while it works out a request), at most the limit of a message. */
export function latestImages<T extends { files: readonly AgentFileDto[] }>(messages: readonly T[]): AgentFileDto[] {
  for (let at = messages.length - 1; at >= 0; at -= 1) {
    const files = messages[at]!.files;
    if (files.length) return files.slice(0, AGENT_MAX_IMAGES);
  }
  return [];
}

/** How many ids the action's `fileIds` field takes (its schema's `maxItems`), or null when it has no such field. */
export function fileCapOf(fields: readonly { name: string; schema: unknown }[]): number | null {
  const field = fields.find((f) => f.name === FILE_IDS_FIELD);
  if (!field) return null;
  const max = (field.schema as { maxItems?: unknown } | null)?.maxItems;
  return typeof max === 'number' && max > 0 ? max : AGENT_MAX_IMAGES;
}

/** The values without `fileIds`: only the platform sets it, from pictures the employee sent. */
export function withoutFileIds(values: Record<string, unknown>): Record<string, unknown> {
  const rest = { ...values };
  delete rest[FILE_IDS_FIELD];
  return rest;
}

/** The ids the employee ticked that are not among the pictures the card showed. */
export function foreignFileIds(chosen: readonly string[], offered: readonly AgentFileDto[]): string[] {
  const known = new Set(offered.map((f) => f.id));
  return chosen.filter((id) => !known.has(id));
}
