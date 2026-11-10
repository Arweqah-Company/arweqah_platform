import { MigrationInterface, QueryRunner } from "typeorm";

export class PerformanceReminderLastSent1794312122463 implements MigrationInterface {
    name = 'PerformanceReminderLastSent1794312122463'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "performance_reminders" ADD "last_sent_on" date`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "performance_reminders" DROP COLUMN "last_sent_on"`);
    }

}
