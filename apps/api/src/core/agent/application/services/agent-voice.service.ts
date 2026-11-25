import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AGENT_AUDIO_MAX_BYTES, AGENT_AUDIO_MAX_SECONDS, AGENT_MESSAGE_MAX_CHARS, type AgentTranscriptDto } from '@arweqah-platform/shared';
import { RateWindow } from '../../../../common/application/rate-window';
import { SecuritySettingsService } from '../../../auth/application/security-settings.service';
import { AiService } from '../../../integrations/application/services/ai.service';
import { AiAudioUnsupportedError, AiNotConfiguredError, AiUnavailableError } from '../../../integrations/domain/errors/integrations.errors';
import { AgentAudioInvalidError, AgentRateLimitedError } from '../../domain/errors/agent.errors';
import { wavFacts } from '../../domain/rules/agent-audio.rules';
import { TRANSCRIBE_SYSTEM } from '../messages/agent.prompt';
import { AgentAvailability } from './agent-availability';

const HOUR_MS = 3_600_000;
const MAX_TOKENS = 3000;
const answerSchema = z.object({ text: z.string() });

/**
 * Speech to text for the chat (FR-181). The sound is held in memory for this request only: it is never stored, never written to the audit and never kept in a
 * conversation; what stays is the text the employee reads, edits and then sends like any message. It goes to the AI service that is switched on, which may not take sound.
 */
@Injectable()
export class AgentVoiceService {
  /** Its own window with the same limit as messages, so speaking cannot use up the typed messages (and the other way round). */
  private readonly window = new RateWindow(30, HOUR_MS);

  constructor(
    private readonly ai: AiService,
    private readonly settings: SecuritySettingsService,
    private readonly availability: AgentAvailability,
  ) {}

  async transcribe(userId: string, wav: Buffer): Promise<AgentTranscriptDto> {
    await this.availability.assertOn();
    this.assertWav(wav);
    if (!this.window.take(userId, Date.now(), await this.settings.get('agentMessagesPerHour'))) throw new AgentRateLimitedError();
    try {
      const { value } = await this.ai.jsonOf({ system: TRANSCRIBE_SYSTEM, user: 'Write down the speech in this recording.', schema: answerSchema, maxTokens: MAX_TOKENS, audio: { format: 'wav', data: wav.toString('base64') } });
      const text = value.text.trim();
      return { text: text.slice(0, AGENT_MESSAGE_MAX_CHARS), truncated: text.length > AGENT_MESSAGE_MAX_CHARS };
    } catch (error) {
      // A service that is off, cannot be reached or does not take sound did no work: the turn is given back.
      if (error instanceof AiNotConfiguredError || error instanceof AiUnavailableError || error instanceof AiAudioUnsupportedError) this.window.refund(userId);
      throw error;
    }
  }

  private assertWav(wav: Buffer): void {
    const facts = wav.length <= AGENT_AUDIO_MAX_BYTES ? wavFacts(wav) : null;
    if (!facts || facts.seconds > AGENT_AUDIO_MAX_SECONDS) throw new AgentAudioInvalidError();
  }
}
