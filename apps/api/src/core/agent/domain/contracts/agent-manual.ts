import type { ManualSection } from '../rules/agent-guide.rules';

/** Port: the user manual as plain text, per language. */
export abstract class AgentManual {
  abstract sections(locale: 'ar' | 'en'): readonly ManualSection[];
}
