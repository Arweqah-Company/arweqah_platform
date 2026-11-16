import { Injectable } from '@nestjs/common';
import { PageVisibilityService } from '../../../access/application/page-visibility.service';
import type { AccessContext } from '../../../access/domain/access-context';
import { AgentManual } from '../../domain/contracts/agent-manual';
import { rankSections } from '../../domain/rules/agent-guide.rules';

/** What the manual search found for a question: the text for the model and the sections it came from (for the links). */
export interface GuideAnswer {
  text: string;
  sections: { id: string; title: string; page: string | null }[];
}

const SECTIONS_SHOWN = 2;
const SECTION_MAX_CHARS = 6000;

/**
 * Answers «how do I do this?» from the user manual (FR-148): the sections that match the question, and only those the person may read:
 * the manual's own rule (any of its keys held, the page not hidden from them), so the assistant never explains a page the person cannot open.
 */
@Injectable()
export class AgentGuideService {
  constructor(
    private readonly manual: AgentManual,
    private readonly pages: PageVisibilityService,
  ) {}

  /** The text of the best sections for the question, or null when the manual has nothing for this person. It looks in the language the question is written in, then in the other one. */
  async find(ctx: AccessContext, question: string, locale: 'ar' | 'en'): Promise<GuideAnswer | null> {
    const hidden = new Set<string>(await this.pages.hiddenFor(ctx));
    const first = /[\u0600-\u06FF]/.test(question) ? 'ar' : /[a-z]/i.test(question) ? 'en' : locale;
    for (const language of [first, first === 'ar' ? 'en' : 'ar'] as const) {
      const readable = this.manual.sections(language).filter((s) => (s.permissions.length === 0 || s.permissions.some((key) => ctx.has(key))) && !(s.page && hidden.has(s.page)));
      const best = rankSections(question, readable, SECTIONS_SHOWN);
      if (best.length > 0) {
        const text = best.map((s) => `# ${s.title} [id: ${s.id}]${s.adminMode ? ' (needs platform admin mode)' : ''}\n${s.text.slice(0, SECTION_MAX_CHARS)}`).join('\n\n');
        return { text, sections: best.map((s) => ({ id: s.id, title: s.title, page: s.page })) };
      }
    }
    return null;
  }
}
