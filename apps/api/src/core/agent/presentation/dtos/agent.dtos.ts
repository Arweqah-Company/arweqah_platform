import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { agentConfirmSchema, agentFormSubmitSchema, agentMessageInputSchema } from '@arweqah-platform/shared';

export class AgentMessageBody extends createZodDto(agentMessageInputSchema) {}
export class AgentIdParam extends createZodDto(z.strictObject({ id: z.uuid() })) {}
export class AgentFormSubmitBody extends createZodDto(agentFormSubmitSchema) {}
export class AgentConfirmBody extends createZodDto(agentConfirmSchema) {}
