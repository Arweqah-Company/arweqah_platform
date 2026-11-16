import { SetMetadata } from '@nestjs/common';
import { AGENT_HIDDEN, AGENT_HINT } from '../domain/types/agent-catalog.types';

/** The route (or the whole controller) stays out of the assistant's catalog, whatever its permission key is. */
export const AgentHidden = () => SetMetadata(AGENT_HIDDEN, true);

/** A sentence the assistant reads with this route: how to fill a field that is not obvious from its name (for example where an id comes from). English, one or two lines. */
export const AgentHint = (hint: string) => SetMetadata(AGENT_HINT, hint);
