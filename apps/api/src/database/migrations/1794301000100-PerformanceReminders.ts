import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The automatic reminders of the evaluation cycle become a list HR keeps (FR-124, plan §3.7ج): the table, the four reminders the concept draws (only while the table is
 * empty), and the single setting the first version kept is removed. The version number is above the migrations that make `performance_settings`, which this deletes from.
 */
const DEFAULTS: [string, string, string, string, string, string][] = [
    ['self', '[7,3,1]', 'تذكير بالتقييم الذاتي', 'Self-evaluation reminder', 'لم ترسل تقييمك الذاتي بعد. أرسله من قسم «تقييم الأداء» في مسارك الوظيفي قبل آخر موعد.', 'You have not sent your self-evaluation yet. Send it from the «performance evaluation» section of your career path before the deadline.'],
    ['mgr', '[2]', 'تقييم ينتظر مراجعتك', 'An evaluation is waiting for your review', 'عندك تقييمات لفريقك تنتظر مراجعتك في صفحة «تقييم فريقي».', 'Evaluations of your team are waiting for your review on the «team evaluation» page.'],
    ['mile', '[3]', 'محطة قريبة', 'A milestone is near', 'اقترب موعد محطة من محطات السنة. سجّل محضرها في «تقييم فريقي».', 'The date of a milestone of the year is near. Record its minutes in «team evaluation».'],
    ['appr', '[1]', 'نتائج تنتظر قرارك', 'Results are waiting for your decision', 'نتائج التقييم تنتظر المعايرة أو الاعتماد في صفحة «المعايرة والاعتماد».', 'The evaluation results are waiting for calibration or approval on the «calibration and approval» page.'],
];

export class PerformanceReminders1794301000100 implements MigrationInterface {
    name = 'PerformanceReminders1794301000100'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "performance_reminders" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "kind" character varying(8) NOT NULL, "is_on" boolean NOT NULL DEFAULT true, "days" jsonb NOT NULL, "title_ar" character varying(120) NOT NULL, "title_en" character varying(120) NOT NULL DEFAULT '', "body_ar" character varying(600) NOT NULL, "body_en" character varying(600) NOT NULL DEFAULT '', "updated_by" uuid, CONSTRAINT "PK_ee21e64188da6b30a969928996c" PRIMARY KEY ("id"))`);
        const rows = DEFAULTS.map((_, i) => `($${i * 6 + 1}::text, $${i * 6 + 2}::jsonb, $${i * 6 + 3}::text, $${i * 6 + 4}::text, $${i * 6 + 5}::text, $${i * 6 + 6}::text, ${i})`).join(', ');
        await queryRunner.query(
            `INSERT INTO performance_reminders (kind, days, title_ar, title_en, body_ar, body_en, created_at)
             SELECT v.kind, v.days, v.title_ar, v.title_en, v.body_ar, v.body_en, now() + (v.n * interval '1 millisecond')
             FROM (VALUES ${rows}) AS v(kind, days, title_ar, title_en, body_ar, body_en, n)
             WHERE NOT EXISTS (SELECT 1 FROM performance_reminders)`,
            DEFAULTS.flatMap(([kind, days, titleAr, titleEn, bodyAr, bodyEn]) => [kind, days, titleAr, titleEn, bodyAr, bodyEn]),
        );
        await queryRunner.query(`DELETE FROM performance_settings WHERE key = 'cycle_reminders'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "performance_reminders"`);
    }

}
