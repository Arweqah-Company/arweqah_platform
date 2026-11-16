import { z } from 'zod';

/** Longest message an employee may send to the assistant. */
export const AGENT_MESSAGE_MAX_CHARS = 2000;

export const AGENT_DRAFT_STATUSES = ['pending', 'confirmed', 'cancelled', 'expired', 'failed'] as const;
export type AgentDraftStatus = (typeof AGENT_DRAFT_STATUSES)[number];

export const agentMessageInputSchema = z.strictObject({
  /** Absent: a new conversation starts. */
  conversationId: z.uuid().optional(),
  text: z.string().trim().min(1).max(AGENT_MESSAGE_MAX_CHARS),
});
export type AgentMessageInput = z.infer<typeof agentMessageInputSchema>;

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
