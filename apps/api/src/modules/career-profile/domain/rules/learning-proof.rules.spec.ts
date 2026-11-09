import { describe, expect, it } from 'vitest';
import { EMPTY_CAREER_CONTENT, type CareerContent } from '@arweqah-platform/shared';
import { approvedMinutes, findUnit, proofProblem, startState } from './learning-proof.rules';

const UNIT = '3f0f6a52-0a14-4a53-9a43-5a6d4c2f9b11';
const content: CareerContent = {
  ...EMPTY_CAREER_CONTENT,
  learning: { badges: [], rule: '', periods: [{ name: 'السنة الأولى', units: [{ id: UNIT, priority: 'إلزامي', title: 'أساسيات التحليل', provider: '', duration: 'ساعتان', minutes: 120, language: 'عربي', link: '' }] }] },
};

describe('learning proof rules (FR-114)', () => {
  it('finds a unit of the plan by its id with its period, and nothing for another id', () => {
    expect(findUnit(content, UNIT)).toEqual({ id: UNIT, title: 'أساسيات التحليل', minutes: 120, period: 'السنة الأولى' });
    expect(findUnit(content, '00000000-0000-4000-8000-000000000000')).toBeNull();
  });

  it('wants a file with a certificate and refuses a second proof while one waits or is approved', () => {
    expect(proofProblem({ kind: 'certificate' }, null)).toBe('file_required');
    expect(proofProblem({ kind: 'certificate', fileId: UNIT }, null)).toBeNull();
    expect(proofProblem({ kind: 'application' }, null)).toBeNull();
    expect(proofProblem({ kind: 'output' }, 'wait')).toBe('already_sent');
    expect(proofProblem({ kind: 'output' }, 'referred')).toBe('already_sent');
    expect(proofProblem({ kind: 'output' }, 'done')).toBe('already_done');
    expect(proofProblem({ kind: 'certificate', fileId: UNIT }, 'rej')).toBeNull();
  });

  it('sends a work application to the manager first and adds up only approved minutes', () => {
    expect(startState('application')).toBe('referred');
    expect(startState('certificate')).toBe('wait');
    expect(approvedMinutes([{ status: 'done', minutes: 120 }, { status: 'wait', minutes: 60 }, { status: 'done', minutes: 30 }])).toBe(150);
  });
});
