import { Injectable } from '@nestjs/common';
import { AgentRepository } from '../../domain/contracts/agent.repository';
import { AGENT_DATA_MAX_CHARS, parseValues, splitByPlace, withoutSensitive } from '../../domain/rules/agent-turn.rules';
import type { AgentAction } from '../../domain/types/agent-catalog.types';
import { AgentCatalogService } from './agent-catalog.service';
import { AgentExecutor, failureOf, type AgentRequestContext } from './agent-executor';

export type LookupOutcome = { data: string } | { note: string };

/** Looks data up for the assistant with a "read" action, as the employee, and keeps what it found so an id can be checked against it (FR-140). */
@Injectable()
export class AgentLookupService {
  constructor(
    private readonly repo: AgentRepository,
    private readonly catalog: AgentCatalogService,
    private readonly executor: AgentExecutor,
  ) {}

  async find(conversationId: string, action: AgentAction | undefined, valuesJson: string, request: AgentRequestContext): Promise<LookupOutcome> {
    const values = parseValues(valuesJson);
    if (!action || action.kind !== 'read') return { note: 'That is not a "read" action of the list.' };
    if (!values) return { note: 'valuesJson must be a JSON object.' };
    const split = splitByPlace(action.fields, values);
    const checked = this.catalog.validate(action.operationId, split);
    if (!checked.ok) return { note: `The parameters are not valid: ${checked.issues.join('; ')}` };
    const result = await this.executor.run(action, split, request);
    if (!result.ok) return { note: `The lookup failed: ${failureOf(result)}` };
    const data = `${action.operationId}: ${JSON.stringify(withoutSensitive(result.body))}`.slice(0, AGENT_DATA_MAX_CHARS);
    await this.repo.addMessage({ conversationId, role: 'tool', text: data });
    return { data };
  }
}
