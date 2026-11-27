import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * «Report a problem» (FR-195…FR-199): the settings of the button (one row), and the key `tickets.report_problem` for every role that lacks it
 * (every employee may report; an administrator can take it from a role on the permissions page).
 */
export class ProblemReports1796100000000 implements MigrationInterface {
    name = 'ProblemReports1796100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "problem_report_settings" ("id" smallint NOT NULL, "enabled" boolean NOT NULL DEFAULT false, "ticket_type_id" uuid, "analyze_with_ai" boolean NOT NULL DEFAULT true, "send_image_to_ai" boolean NOT NULL DEFAULT false, "max_per_hour" integer NOT NULL DEFAULT 10, "updated_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_problem_report_settings" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "problem_report_settings" ADD CONSTRAINT "FK_problem_report_settings_type" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`INSERT INTO "problem_report_settings" ("id") VALUES (1)`);
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, 'tickets.report_problem', 'all' FROM roles r
            WHERE NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = 'tickets.report_problem')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "problem_report_settings" DROP CONSTRAINT "FK_problem_report_settings_type"`);
        await queryRunner.query(`DROP TABLE "problem_report_settings"`);
    }
}
