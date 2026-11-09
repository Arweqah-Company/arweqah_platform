import type { TourDto } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { playSteps, type OwnedStep } from './play-steps';

const t = ((key: string, o?: { ns?: string }) => `${o?.ns}:${key}`) as never;
const owner = (key: string, ns = 'tour'): [string, OwnedStep] => [key, { ui: { key, target: 'body' }, ns }];
const owners = new Map([owner('welcome'), owner('tickets', 'tickets'), owner('finish')]);
const step = (key: string, over: object = {}) => ({ key, titleAr: null, titleEn: null, bodyAr: null, bodyEn: null, ...over }) as TourDto['steps'][number];
const dto = (over: Partial<TourDto> = {}): TourDto => ({ tour: 'general', status: 'none', steps: [step('welcome'), step('tickets'), step('finish')], newSteps: [], ...over });
const play = (d: TourDto, onlyNew = false, lang = 'ar') => playSteps(d, owners, { onlyNew, lang, t, allowed: () => true });

describe('playSteps (FR-67)', () => {
  it('uses the code’s wording from the feature that owns the step', () => {
    expect(play(dto()).map((s) => s.title)).toEqual(['tour:tour.welcome.title', 'tickets:tour.tickets.title', 'tour:tour.finish.title']);
  });

  it('prefers the administrator’s wording in the language on screen', () => {
    const d = dto({ steps: [step('welcome', { titleAr: 'أهلًا', titleEn: 'Hi', bodyEn: 'Body' })] });
    expect(play(d, false, 'ar')[0]).toMatchObject({ title: 'أهلًا', body: 'tour:tour.welcome.body' });
    expect(play(d, false, 'en')[0]).toMatchObject({ title: 'Hi', body: 'Body' });
  });

  it('plays only the new steps for the «what’s new» tour', () => {
    expect(play(dto({ status: 'completed', newSteps: ['tickets'] }), true).map((s) => s.key)).toEqual(['tickets']);
  });

  it('leaves out a step no feature points anywhere', () => {
    expect(play(dto({ steps: [step('welcome'), step('nowhere')] })).map((s) => s.key)).toEqual(['welcome']);
  });

  describe('one step for a page, never a second one with the same name (FR-67)', () => {
    const page = (key: string, route: string, menu?: 'account'): [string, OwnedStep] => [key, { ui: { key, target: '[data-tour="main-list"]', route, menu }, ns: 'tour' }];
    const pages = new Map([page('tickets', '/tickets'), page('tasks', '/tasks'), page('task-new', '/tasks'), page('profile', '/profile', 'account')]);
    const run = (...keys: string[]) => playSteps(dto({ steps: keys.map((k) => step(k)) }), pages, { onlyNew: false, lang: 'ar', t, allowed: () => true });

    it('plays the page’s own step only: there is no extra bubble on its sidebar link', () => {
      expect(run('tickets').map((s) => s.key)).toEqual(['tickets']);
      expect(run('tasks', 'task-new').map((s) => s.key)).toEqual(['tasks', 'task-new']);
    });

    it('never shows two steps with the same title in a row, and none points at the page title', () => {
      const steps = run('tickets', 'tasks', 'task-new', 'profile');
      const titles = steps.map((s) => s.title);
      expect(titles.every((t, i) => t !== titles[i - 1])).toBe(true);
      expect(steps.every((s) => !s.ui.target.includes('page-title') && !s.ui.target.includes('nav:'))).toBe(true);
    });
  });

  describe('what the person can do on the page', () => {
    const abilities = new Map<string, OwnedStep>([['tasks', { ns: 'tasks', ui: { key: 'tasks', target: 'x', can: [{ id: 'team', permission: 'tasks.team_view' }, { id: 'assign', permission: 'tasks.assign' }] } }]]);
    const lines = (held: string[]) => playSteps(dto({ steps: [step('tasks')] }), abilities, { onlyNew: false, lang: 'ar', t, allowed: (p) => held.includes(p) })[0]!.can;

    it('lists a line for every permission the person holds, in the code’s order', () => {
      expect(lines(['tasks.assign', 'tasks.team_view'])).toEqual(['tasks:tour.tasks.can.team', 'tasks:tour.tasks.can.assign']);
    });

    it('leaves out what the person may not do, and says nothing when they may do none of it', () => {
      expect(lines(['tasks.assign'])).toEqual(['tasks:tour.tasks.can.assign']);
      expect(lines([])).toEqual([]);
    });
  });
});
