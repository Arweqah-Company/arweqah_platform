import { Injectable } from '@nestjs/common';
import { AgentManual } from '../../domain/contracts/agent-manual';
import type { ManualSection } from '../../domain/rules/agent-guide.rules';
import ar from '../../assets/manual-text.ar.json';
import en from '../../assets/manual-text.en.json';

/** The manual `npm run docs:build` writes next to the assistant (it is compiled into the API, so it ships with it). */
@Injectable()
export class ManualTextAdapter extends AgentManual {
  sections(locale: 'ar' | 'en'): readonly ManualSection[] {
    return (locale === 'ar' ? ar : en) as ManualSection[];
  }
}
