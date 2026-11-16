import { Injectable } from '@nestjs/common';
import type { AgentConversationDetailDto, AgentConversationDto } from '@arweqah-platform/shared';
import { AgentRepository } from '../../domain/contracts/agent.repository';
import { AgentConversationNotFoundError } from '../../domain/errors/agent.errors';
import { AgentAvailability } from './agent-availability';
import { toConversationDto, toMessageDto } from '../transformers/agent.transformer';

const LIST_LIMIT = 50;
const DETAIL_LIMIT = 200;

/** The employee's own conversations: the list and one of them (never someone else's: that answers «not found»). */
@Injectable()
export class AgentConversationsService {
  constructor(
    private readonly repo: AgentRepository,
    private readonly availability: AgentAvailability,
  ) {}

  async list(userId: string): Promise<AgentConversationDto[]> {
    await this.availability.assertOn();
    return (await this.repo.listConversations(userId, LIST_LIMIT)).map(toConversationDto);
  }

  async detail(userId: string, id: string): Promise<AgentConversationDetailDto> {
    await this.availability.assertOn();
    const conversation = await this.repo.findConversation(id, userId);
    if (!conversation) throw new AgentConversationNotFoundError();
    const messages = (await this.repo.recentMessages(id, DETAIL_LIMIT)).filter((m) => m.role !== 'tool');
    return { ...toConversationDto(conversation), messages: messages.map(toMessageDto) };
  }
}
