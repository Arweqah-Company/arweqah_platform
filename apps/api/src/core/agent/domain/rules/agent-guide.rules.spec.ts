import { describe, expect, it } from 'vitest';
import { rankSections, normalizeText, topicWords, type ManualSection } from './agent-guide.rules';

const section = (id: string, title: string, text: string): ManualSection => ({ id, title, permissions: [], page: null, adminMode: false, text });

describe('Finding the manual section that answers «how do I…» (FR-148)', () => {
  it('writes Arabic the way people type it: no marks, one alef, ya and ta marbuta', () => {
    expect(normalizeText('التَّذْكِرَة')).toBe(normalizeText('التذكره'));
    expect(normalizeText('إضافة أنواع')).toBe('اضافه انواع');
    expect(normalizeText('على')).toBe('علي');
  });

  it('keeps the topic words of a question and drops the article and the filler words', () => {
    expect(topicWords('كيف أضيف نوع التذكرة؟')).toEqual(['نوع', 'تذكره']);
    expect(topicWords('How do I add a ticket type?')).toEqual(['add', 'ticket', 'type']);
  });

  it('ranks a title match above a body match, and leaves out sections that have no word of the question', () => {
    const sections = [
      section('a', 'Tasks', 'You can open a ticket type from a task'),
      section('b', 'Ticket setup', 'Add a type of ticket for your unit'),
      section('c', 'Security', 'Devices and sessions'),
    ];
    expect(rankSections('how do I add a ticket type', sections, 2).map((s) => s.id)).toEqual(['b', 'a']);
    expect(rankSections('weather', sections, 2)).toEqual([]);
  });

  it('finds the Arabic section from a question written with different letters', () => {
    const sections = [section('s', 'إعداد التذاكر', 'يضيف رئيس الوحدة أنواع التذاكر من هنا'), section('t', 'الأمان', 'الأجهزة والجلسات')];
    expect(rankSections('ازاي اضيف نوع تذكره', sections, 1).map((s) => s.id)).toEqual(['s']);
  });
});
