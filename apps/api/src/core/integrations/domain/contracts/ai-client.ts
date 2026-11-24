import type { AiProviderKey, ProviderValues } from '@arweqah-platform/shared';

/** Which provider to ask and with which data (its key, and its address when it has one). */
export interface AiModelsRequest {
  providerKey: AiProviderKey;
  values: ProviderValues;
}

/** A picture the model reads together with the text (base64, no data-URL prefix). */
export interface AiImage {
  mediaType: 'image/png' | 'image/jpeg';
  data: string;
}

/** Speech the model listens to (base64 of a 16-bit PCM WAV, no prefix). */
export interface AiAudio {
  format: 'wav';
  data: string;
}

export interface AiJsonRequest {
  /** Which provider answers, and the data of its form (key, model, address…): each strategy reads the fields it needs. */
  providerKey: AiProviderKey;
  values: ProviderValues;
  system: string;
  /** What the model reads: untrusted text is passed here, never in `system`. */
  user: string;
  /** Pictures that go with `user`; a service that cannot read them answers `imagesRejected`. */
  images?: AiImage[];
  /** Speech that goes with `user`; a service that cannot take it answers `audioUnsupported`. */
  audio?: AiAudio;
  /** JSON Schema of the answer; the service constrains the output to it. */
  schema: Record<string, unknown>;
  maxTokens: number;
  /** Called with each piece of the answer's text as the service writes it (a screen shows it live); the final outcome still carries the whole text. */
  onText?: (delta: string) => void;
}

/**
 * What came back. A problem of the service itself is an outcome, never an exception (same idea as the bot check's verdict):
 * `refused` = the model declined, `truncated` = the answer hit the size limit, `failed` = network, key, quota or timeout.
 */
export type AiJsonOutcome =
  | { kind: 'ok'; text: string; inputTokens: number; outputTokens: number }
  | { kind: 'refused' }
  | { kind: 'truncated' }
  | {
      kind: 'failed';
      message: string;
      /** The service said it is busy or limited for now (a later try may work). */
      busy?: boolean;
      /** The request carried pictures and the service refused it as malformed: this model does not read pictures (the same request without them may work). */
      imagesRejected?: boolean;
      /** The request carried sound and the service cannot take it: this provider (or model) has no sound input. */
      audioUnsupported?: boolean;
    };

/** The models a provider offers to this key. A failure is an outcome, like for an answer. */
export type AiModelsOutcome = { kind: 'ok'; models: string[] } | { kind: 'failed'; message: string };

/** Port to the AI service: the rest of the platform asks it for an answer and never knows which provider gives it. */
export abstract class AiClient {
  abstract json(request: AiJsonRequest): Promise<AiJsonOutcome>;
  abstract models(request: AiModelsRequest): Promise<AiModelsOutcome>;
}

/** Strategy: how one provider answers a request (the Anthropic SDK, an OpenAI-compatible HTTP call…). */
export abstract class AiStrategy {
  abstract readonly providerKey: AiProviderKey;
  abstract json(request: AiJsonRequest): Promise<AiJsonOutcome>;
  abstract models(request: AiModelsRequest): Promise<AiModelsOutcome>;
}
