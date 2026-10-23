import { addWorkingDays, type CatalogDeskDto, type CatalogTypeDto, type FileDto, type TicketCatalogDto } from '@arweqah-platform/shared';
import { useState } from 'react';

export interface Draft {
  title: string;
  details: string;
  urgent: boolean;
  /** Empty until chosen or suggested. */
  neededBy: string;
  files: FileDto[];
}

export const EMPTY_DRAFT: Draft = { title: '', details: '', urgent: false, neededBy: '', files: [] };

export interface Choice {
  desk: CatalogDeskDto;
  type: CatalogTypeDto;
}

/** The suggested date (today plus the type's usual duration, in working days) and the earliest one the desk accepts. */
export function datesFor(choice: Choice, today: string): { suggested: string; earliest: string } {
  return { suggested: addWorkingDays(today, choice.type.dueDays), earliest: addWorkingDays(today, choice.desk.minLeadDays) };
}

/** The two steps of "new ticket": pick the department and type, then fill in the ticket. Changing the type keeps what was typed. */
export function useNewTicket(catalog: TicketCatalogDto | undefined) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  const choose = (next: Choice) => {
    setChoice(next);
    // A date the person did not pick follows the type; one they picked stays.
    setDraft((d) => ({ ...d, neededBy: d.neededBy && choice && d.neededBy !== datesFor(choice, catalog?.today ?? '').suggested ? d.neededBy : datesFor(next, catalog?.today ?? '').suggested }));
  };
  const patch = (change: Partial<Draft>) => setDraft((d) => ({ ...d, ...change }));
  const reset = () => {
    setChoice(null);
    setDraft(EMPTY_DRAFT);
  };
  return { choice, draft, choose, patch, back: () => setChoice(null), reset };
}
