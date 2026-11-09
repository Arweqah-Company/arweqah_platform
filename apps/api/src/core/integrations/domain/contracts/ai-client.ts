export interface AiJsonRequest {
  apiKey: string;
  model: string;
  system: string;
  /** What the model reads: untrusted text is passed here, never in `system`. */
  user: string;
  /** JSON Schema of the answer; the service constrains the output to it. */
  schema: Record<string, unknown>;
  maxTokens: number;
}

/**
 * What came back. A problem of the service itself is an outcome, never an exception (same idea as the bot check's verdict):
 * `refused` = the model declined, `truncated` = the answer hit the size limit, `failed` = network, key, quota or timeout.
 */
export type AiJsonOutcome =
  | { kind: 'ok'; text: string; inputTokens: number; outputTokens: number }
  | { kind: 'refused' }
  | { kind: 'truncated' }
  | { kind: 'failed'; message: string };

/** Port to the AI service (Anthropic) so nothing else in the platform calls it directly. */
export abstract class AiClient {
  abstract json(request: AiJsonRequest): Promise<AiJsonOutcome>;
}
