import { z } from 'zod';

/** Longest message an employee may send to the assistant. */
export const AGENT_MESSAGE_MAX_CHARS = 2000;

export const AGENT_DRAFT_STATUSES = ['pending', 'confirmed', 'cancelled', 'expired', 'failed'] as const;
export type AgentDraftStatus = (typeof AGENT_DRAFT_STATUSES)[number];

/** Pictures an employee may attach to one message (screenshots of the problem), their kinds and the largest one (FR-180). */
export const AGENT_MAX_IMAGES = 3;
export const AGENT_IMAGE_TYPES = ['image/png', 'image/jpeg'] as const;
export const AGENT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const agentMessageInputSchema = z
  .strictObject({
    /** Absent: a new conversation starts. */
    conversationId: z.uuid().optional(),
    /** May be empty when pictures come with it. */
    text: z.string().trim().max(AGENT_MESSAGE_MAX_CHARS),
    /** Pictures uploaded with `POST /agent/files` and sent with this message. */
    fileIds: z.array(z.uuid()).max(AGENT_MAX_IMAGES).default([]),
  })
  .refine((input) => input.text.length > 0 || input.fileIds.length > 0, { message: 'Write a message or attach a picture', path: ['text'] });
export type AgentMessageInput = z.infer<typeof agentMessageInputSchema>;

/** A picture of a conversation: what the screen needs to show and open it (the bytes come from `/agent/files/:id/preview`). */
export interface AgentFileDto {
  id: string;
  name: string;
  contentType: string;
  size: number;
}

/** Confirming a draft: which of the conversation's pictures go with the request (those the card showed and the employee left ticked). */
export const agentConfirmSchema = z.preprocess((body) => body ?? {}, z.strictObject({ fileIds: z.array(z.uuid()).max(AGENT_MAX_IMAGES * 4).default([]) }));
export type AgentConfirmInput = { fileIds: string[] };

/** Speaking to the assistant (FR-181): the sound is turned into a 16 kHz mono WAV by the screen, at most this long and this big, and is never stored. */
export const AGENT_AUDIO_MAX_SECONDS = 300;
export const AGENT_AUDIO_MAX_BYTES = 10 * 1024 * 1024;
export const AGENT_AUDIO_SAMPLE_RATE = 16_000;

/** What the speech was turned into: the employee reads and edits it before sending. */
export interface AgentTranscriptDto {
  text: string;
  /** The speech was longer than a message may be, so the text was cut at the limit. */
  truncated: boolean;
}

/** What happened when a confirmed draft ran (the route's own answer, never its data). */
export interface AgentDraftResultDto {
  ok: boolean;
  /** HTTP status the route answered. */
  status: number;
  /** The route's own message (or its error code) for a failure; empty on success. */
  message: string;
}

/** The request the assistant prepared and waits for the employee to confirm. */
export interface AgentDraftDto {
  id: string;
  operationId: string;
  labelAr: string;
  labelEn: string;
  /** What the employee reads on the confirmation card, in their own words (names, not ids). */
  summary: string;
  /** The fields as the assistant filled them; ids stay, the card shows `summary`. */
  values: Record<string, unknown>;
  /** A DELETE: the card is red and names the item. */
  destructive: boolean;
  status: AgentDraftStatus;
  expiresAt: string;
  result: AgentDraftResultDto | null;
  /** The conversation's pictures that may go with the request (only for an action that takes files); the card lets the employee tick which. */
  files: AgentFileDto[];
}

/** A link under the assistant's message: the manual section that explains it and, when that section is about a page, the page's key (the screen turns it into an address from its own menu). */
export interface AgentLinkDto {
  sectionId: string;
  title: string;
  page: string | null;
}

export const AGENT_FORM_FIELD_TYPES = ['text', 'longtext', 'number', 'integer', 'boolean', 'date', 'select'] as const;
export type AgentFormFieldType = (typeof AGENT_FORM_FIELD_TYPES)[number];

export interface AgentFormOptionDto {
  label: string;
  value: string;
}

/** One field of the form the assistant opens in the chat, drawn from the action's own schema. */
export interface AgentFormFieldDto {
  name: string;
  label: string;
  required: boolean;
  type: AgentFormFieldType;
  min?: number;
  max?: number;
  maxLength?: number;
  /** A `select`: the values to choose from (ids come from a lookup the platform checked, other values from the schema's own list). */
  options?: AgentFormOptionDto[];
  /** A `select` whose values are numbers (a flag such as 0 / 1): the options carry them as text and the platform turns the choice back into a number. */
  numeric?: boolean;
}

export const AGENT_FORM_STATUSES = ['open', 'submitted'] as const;
export type AgentFormStatus = (typeof AGENT_FORM_STATUSES)[number];

/** The form the assistant offers when fields are missing: filled with what it understood, ready for the employee to complete. */
export interface AgentFormDto {
  operationId: string;
  labelAr: string;
  labelEn: string;
  fields: AgentFormFieldDto[];
  values: Record<string, unknown>;
  status: AgentFormStatus;
}

export const agentFormSubmitSchema = z.strictObject({ values: z.record(z.string(), z.unknown()) });
export type AgentFormSubmitInput = z.infer<typeof agentFormSubmitSchema>;

export interface AgentMessageDto {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  draft: AgentDraftDto | null;
  links: AgentLinkDto[] | null;
  form: AgentFormDto | null;
  /** The pictures the employee sent with this message. */
  files: AgentFileDto[];
  createdAt: string;
}

export interface AgentConversationDto {
  id: string;
  title: string;
  updatedAt: string;
}

export interface AgentConversationDetailDto extends AgentConversationDto {
  messages: AgentMessageDto[];
}

/** The answer to one message: the messages that turn produced (the assistant's reply, or its question, or a draft to confirm). */
export interface AgentReplyDto {
  conversationId: string;
  messages: AgentMessageDto[];
}

/** What the assistant is doing while it works on a message (a code the screen words itself; `label` is an action's name in the person's language). */
export type AgentStatusDto = { code: 'thinking' } | { code: 'manual' } | { code: 'permission' } | { code: 'lookup' | 'preparing'; label: string };
