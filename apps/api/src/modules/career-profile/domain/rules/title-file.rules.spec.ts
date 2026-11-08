import { describe, expect, it } from 'vitest';
import { SAMPLE_TITLE_FILE } from './fixtures/title-file.sample';
import { deadlineOf } from './required-actions.rules';
import { readTitleFile } from './title-file.rules';

describe('title file rules (FR-113)', () => {
  const reading = readTitleFile(SAMPLE_TITLE_FILE, 'OPS.01.01.01-L9P-01');

  it('reads the sample file of the concept with nothing left to fix', () => {
    expect(reading.problems).toEqual([]);
    expect(reading.counts).toEqual({
      indicators: 3, responsibilities: 4, tasks: 12, ladderLevels: 7, pathSteps: 4, competencies: 13,
      badges: 4, learningPeriods: 3, learningUnits: reading.counts.learningUnits, learningMinutes: reading.counts.learningMinutes, requiredItems: 6,
    });
    expect(reading.counts.learningUnits).toBeGreaterThan(10);
    expect(reading.codeInFile).toBe('OPS.01.01.01-L9P-01');
  });

  it('reads the job description: the summary, the governing indicator, and the responsibilities with their tasks', () => {
    const c = reading.content;
    expect(c.summary).toContain('تنسيق ودعم أعمال وحدة الاستقطاب');
    expect(c.kpis.map((k) => k.governing)).toEqual([true, false, false]);
    expect(c.kpis[0]?.text).toBe('تحقيق مستهدف المقبولين المؤهلين في موعده');
    expect(c.responsibilities[0]).toEqual({ title: 'تحديد الفئة المستهدفة ودراستها', tasks: ['تحليل مستهدفات المشروع وخصائص فئته', 'تحديد معايير الأهلية بالتنسيق مع مدير المشروع', 'بناء قاعدة البيانات الأولية للفئة'] });
  });

  it('reads the development: the ladder with the current title, the condition, the level path and the competencies', () => {
    const c = reading.content;
    expect(c.ladder[0]).toEqual({ level: 'L9', title: 'منسق الاستقطاب', current: true });
    expect(c.ladder.filter((l) => l.current)).toHaveLength(1);
    expect(c.transitionRule).toContain('إتقان الحالات القياسية');
    expect(c.pathUnit).toBe('إدارة التشغيل · وحدة الاستقطاب');
    expect(c.steps.map((s) => s.n)).toEqual([1, 2, 3, 4]);
    expect(c.output).toContain('تنفيذ حملة اتصال');
    expect(c.competencyColumns).toHaveLength(4);
    expect(c.competencies[0]).toEqual({ name: 'الاتصال المباشر والإقناع', values: ['أساسي', 'خبير', '—', '—'] });
  });

  it('reads the learning plan: badges, periods in file order, and units with their minutes', () => {
    expect(reading.learning.badges.map((b) => b.hours)).toEqual([35, 65, 115, 120]);
    expect(reading.learning.periods.map((p) => p.name)).toEqual(['السنة 1', 'السنة 2', 'ما بعد السنة 2']);
    const first = reading.learning.periods[0]!;
    expect(first.header).toMatchObject({ count: 13, minutes: 39 * 60 + 18 });
    expect(first.units[0]).toMatchObject({ priority: 'إلزامي', minutes: 318, language: 'عربي' });
  });

  it('puts the learning plan in the content, units without ids (they get them when saved)', () => {
    const l = reading.content.learning;
    expect(l.badges.map((b) => b.hours)).toEqual([35, 65, 115, 120]);
    expect(l.rule).toMatch(/^ويبلغ الموظف الوسام/);
    expect(l.periods.map((p) => p.units.length)).toEqual([13, expect.any(Number), expect.any(Number)]);
    expect(l.periods[0]?.units[0]).toEqual({ priority: 'إلزامي', title: expect.stringContaining('الذكاء الاصطناعي'), provider: expect.stringContaining('المنتور'), duration: '5 ساعات و18 دقيقة', minutes: 318, language: 'عربي', link: '' });
    expect(l.periods[0]?.units[0]).not.toHaveProperty('id');
  });

  it('reads the required actions with the last date of each heading as its deadline, and the acknowledgement', () => {
    const c = reading.content;
    expect(c.required[0]).toMatchObject({ when: '15 أكتوبر 2026', deadline: '2026-10-15' });
    expect(c.required.map((r) => r.deadline)).toEqual(['2026-10-15', '2026-11-15', '2027-03-31', '2027-03-31', '2027-04-30', null]);
    expect(c.ackText).toMatch(/^اطلعت على الوصف الوظيفي/);
  });

  it('leaves the buttons of the page it was copied from out, and says so', () => {
    expect(reading.ignored).toContain('التالي');
    expect(reading.content.responsibilities.flatMap((g) => g.tasks)).not.toContain('التالي');
  });

  it('flags a title code in the file that is not the title\'s own code (code_mismatch), and not when the code is unknown', () => {
    expect(readTitleFile(SAMPLE_TITLE_FILE, 'OPS.03.03.01-L8P-01').problems).toEqual(['code_mismatch']);
    expect(readTitleFile(SAMPLE_TITLE_FILE, null).problems).toEqual([]);
  });

  it('flags a learning period whose own total does not agree with its units', () => {
    const broken = SAMPLE_TITLE_FILE.replace('السنة 1: 13 وحدة', 'السنة 1: 12 وحدة');
    expect(readTitleFile(broken, null).problems).toEqual(['learning_total_mismatch']);
  });

  it('reports every missing part of an empty or partial file', () => {
    expect(readTitleFile('نص لا يخص أي قسم', null).problems).toEqual([
      'summary_missing', 'indicators_missing', 'responsibilities_missing', 'current_title_unmarked', 'path_steps_missing', 'transition_rule_missing',
      'competencies_missing', 'learning_missing', 'badges_missing', 'required_missing', 'acknowledgement_missing',
    ]);
    const jobOnly = SAMPLE_TITLE_FILE.split('التطوير المهني')[0] as string;
    expect(readTitleFile(jobOnly, null).problems).not.toContain('summary_missing');
    expect(readTitleFile(jobOnly, null).problems).toContain('current_title_unmarked');
  });

  it('flags content the contract refuses (a line longer than a field allows)', () => {
    const long = SAMPLE_TITLE_FILE.replace('ملخص الوظيفة\n', `ملخص الوظيفة\n${'ا'.repeat(2100)}\n`);
    expect(readTitleFile(long, null).problems).toEqual(['content_invalid']);
  });
});

describe('deadlineOf (FR-113)', () => {
  it.each([
    ['15 أكتوبر 2026', '2026-10-15'],
    ['حتى 15 نوفمبر 2026', '2026-11-15'],
    ['من أكتوبر 2026 إلى مارس 2027', '2027-03-31'],
    ['فبراير ومارس 2027', '2027-03-31'],
    ['قبل 30 أبريل 2027', '2027-04-30'],
    ['فبراير 2028', '2028-02-29'],
    ['ما دمت في هذه الفترة', null],
  ])('reads «%s» as %s', (heading, deadline) => {
    expect(deadlineOf(heading)).toBe(deadline);
  });
});
