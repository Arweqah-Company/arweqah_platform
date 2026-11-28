import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Files on tasks (FR-212…FR-214): `task_files` keeps the reference files a task is made with and the delivery files the doer hands in, and the
 * three keys (`tasks.file_add`, `tasks.file_deliver`, `tasks.file_remove`, scope `all`: the relation to the task is a rule of the service) go to the
 * automatic roles «everyone» and «node_head» (standing rule 17), only where a role lacks them.
 */
export class TaskFiles1796350000000 implements MigrationInterface {
    name = 'TaskFiles1796350000000'

    private readonly keys = ['tasks.file_add', 'tasks.file_deliver', 'tasks.file_remove'];

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "task_files" ("task_id" uuid NOT NULL, "file_id" uuid NOT NULL, "kind" character varying(10) NOT NULL, "added_by_user_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_task_files" PRIMARY KEY ("task_id", "file_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_task_files_task" ON "task_files"  ("task_id", "created_at") `);
        await queryRunner.query(`ALTER TABLE "task_files" ADD CONSTRAINT "FK_task_files_task" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_files" ADD CONSTRAINT "FK_task_files_file" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_files" ADD CONSTRAINT "FK_task_files_user" FOREIGN KEY ("added_by_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`
            INSERT INTO role_permissions (role_id, permission_key, scope)
            SELECT r.id, k.key, 'all' FROM roles r CROSS JOIN unnest($1::text[]) AS k(key)
            WHERE r.auto_rule IN ('everyone', 'node_head')
            AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = k.key)`,
            [this.keys]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM role_permissions p USING roles r WHERE p.role_id = r.id AND r.auto_rule IN ('everyone', 'node_head') AND p.permission_key = ANY($1)`, [this.keys]);
        await queryRunner.query(`ALTER TABLE "task_files" DROP CONSTRAINT "FK_task_files_user"`);
        await queryRunner.query(`ALTER TABLE "task_files" DROP CONSTRAINT "FK_task_files_file"`);
        await queryRunner.query(`ALTER TABLE "task_files" DROP CONSTRAINT "FK_task_files_task"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_task_files_task"`);
        await queryRunner.query(`DROP TABLE "task_files"`);
    }

}
